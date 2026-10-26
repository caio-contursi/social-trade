import re
import secrets
import unicodedata
import html
from uuid import uuid4
from contextlib import contextmanager
from fastapi import Depends, FastAPI, HTTPException, Response, status
from sqlalchemy import delete, func, insert, select, text, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.auth import current_user, moderator
from app.catalog import ROLE_LABELS, get_catalog_codes, load_catalog
from app.config import DEMO_USERS_ENABLED
from app.database import connect, transaction
from app.models import (
    announcements as announcement_table, donations, organization_areas, organization_services,
    organizations, project_memberships, support_tickets, users,
)
from app.schemas import (
    AnnouncementInput, DonationCreateInput, DonationPaymentReportInput,
    InstitutionRegisterInput, LoginInput, OrganizationCreate, PixVerificationInput, ProfileUpdate,
    RegisterInput, TicketInput, TicketStatusInput,
)
from app.security import hash_password, issue_token, verify_password


app = FastAPI(title="SocialTrade", version="0.1.0", description="Cadastro e acompanhamento de organizações sociais.")
PUBLIC_ORGANIZATION_FIELDS = (
    "id", "name", "slug", "organization_type", "city", "state", "founding_year",
    "short_description", "objective", "impact_summary", "description", "website_url",
    "instagram_url", "logo_url", "created_at",
)
EDITABLE_ORGANIZATION_FIELDS = (
    "name", "organization_type", "cnpj", "city", "state", "founding_year",
    "short_description", "objective", "impact_summary", "description", "website_url",
    "instagram_url", "pix_key", "logo_url",
)
donor_organizations = organizations.alias("donor_organizations")


@contextmanager
def write_transaction():
    """Uniqueness is enforced again by PostgreSQL for concurrent requests."""
    try:
        with transaction() as db:
            yield db
    except IntegrityError as error:
        if getattr(error.orig, "sqlstate", None) == "23505":
            raise HTTPException(status_code=409, detail="Os dados informados já estão cadastrados ou em uso.") from error
        raise


def insert_with_generated_value(db, table, values: dict, field: str, generate, constraint: str):
    """Retry only a generated value's collision, keeping the outer write atomic."""
    for _ in range(10):
        generated = generate()
        try:
            with db.begin_nested():
                identifier = db.execute(insert(table).values(**values, **{field: generated})
                    .returning(table.c.id)).scalar_one()
            return identifier, generated
        except IntegrityError as error:
            if (getattr(error.orig, "sqlstate", None) != "23505"
                    or getattr(getattr(error.orig, "diag", None), "constraint_name", None) != constraint):
                raise
    raise HTTPException(status_code=503, detail="Não foi possível concluir o cadastro. Tente novamente.")


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-") or "organizacao"


def unique_slug(db, name: str) -> str:
    base = slugify(name)[:140]
    candidate = base
    number = 2
    while db.execute(select(organizations.c.id).where(organizations.c.slug == candidate)).first():
        candidate = f"{base[:135]}-{number}"
        number += 1
    return candidate


def generate_registration_number(db) -> str:
    while True:
        number = f"{secrets.randbelow(1_000_000):06d}"
        if not db.execute(select(users.c.id).where(users.c.registration_number == number)).first():
            return number


def validate_organization_catalog(db, data: dict) -> None:
    codes = get_catalog_codes(db)
    if data["organization_type"] not in codes["organization_types"]:
        raise HTTPException(status_code=422, detail="Tipo de organização desconhecido.")
    if unknown := set(data["areas"]) - codes["areas"]:
        raise HTTPException(status_code=422, detail=f"Áreas desconhecidas: {', '.join(sorted(unknown))}")
    if unknown := set(data.get("interested_services", [])) - codes["services"]:
        raise HTTPException(status_code=422, detail=f"Serviços desconhecidos: {', '.join(sorted(unknown))}")


def replace_organization_relationships(db, org_id: int, data: dict) -> None:
    db.execute(delete(organization_areas).where(organization_areas.c.organization_id == org_id))
    values = [{"organization_id": org_id, "area_code": code} for code in dict.fromkeys(data.get("areas", []))]
    if values:
        db.execute(insert(organization_areas), values)
    db.execute(delete(organization_services).where(organization_services.c.organization_id == org_id))
    values = [{"organization_id": org_id, "service_code": code} for code in dict.fromkeys(data.get("interested_services", []))]
    if values:
        db.execute(insert(organization_services), values)


def create_org(db, owner_id: int, data: dict) -> int:
    validate_organization_catalog(db, data)
    values = {field: data.get(field) for field in EDITABLE_ORGANIZATION_FIELDS}
    values.update(owner_id=owner_id, name=data["name"].strip(),
                  institution_kind=data.get("institution_kind", "project"), city=data["city"].strip(),
                  state=data["state"].upper(), short_description=data["short_description"].strip())
    org_id, _ = insert_with_generated_value(db, organizations, values, "slug",
        lambda: unique_slug(db, data["name"]), "uq_organizations_slug")
    replace_organization_relationships(db, org_id, data)
    return org_id


def organization_profile_metadata(data: dict, owner_email: str) -> dict:
    """Measure presentation completeness, never identity or financial verification."""
    fields = ("name", "organization_type", "city", "state", "short_description", "description", "logo_url")
    checks = [bool(str(data.get(field) or "").strip()) for field in fields]
    checks.append(any(bool(str(data.get(field) or "").strip()) for field in ("website_url", "instagram_url")))
    if data.get("institution_kind") == "project":
        checks.extend(bool(str(data.get(field) or "").strip()) for field in ("objective", "impact_summary"))
        checks.append(bool(data.get("areas")))
    return {
        "verification_status": "self_declared",
        "profile_completeness": round(100 * sum(checks) / len(checks)),
        "is_demo": owner_email.strip().lower().endswith(("@socialtrade.local", "@impactledger.local")),
    }


def organization_view(db, org_id: int) -> dict:
    row = db.execute(select(organizations, users.c.email.label("owner_email"))
                     .join(users, users.c.id == organizations.c.owner_id)
                     .where(organizations.c.id == org_id)).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Organização não encontrada.")
    result = dict(row)
    owner_email = result.pop("owner_email")
    result["areas"] = list(db.execute(select(organization_areas.c.area_code)
        .where(organization_areas.c.organization_id == org_id).order_by(organization_areas.c.area_code)).scalars())
    selected = set(db.execute(select(organization_services.c.service_code)
        .where(organization_services.c.organization_id == org_id)).scalars())
    result["services"] = [{**item, "interested": item["code"] in selected} for item in load_catalog(db)["services"]]
    result["pix_donations_available"] = bool(
        result["institution_kind"] == "project" and result["cnpj"]
        and result["pix_key"] and result["pix_key_verified_at"]
    )
    result.update(organization_profile_metadata(result, owner_email))
    return result


def public_organization_view(db, row) -> dict:
    result = {key: row[key] for key in PUBLIC_ORGANIZATION_FIELDS}
    result["pix_donations_available"] = bool(
        row["institution_kind"] == "project" and row["private_cnpj"]
        and row["private_pix_key"] and row["private_pix_key_verified_at"]
    )
    result["areas"] = list(db.execute(select(organization_areas.c.area_code)
        .where(organization_areas.c.organization_id == row["id"]).order_by(organization_areas.c.area_code)).scalars())
    result.update(organization_profile_metadata({**result, "institution_kind": row["institution_kind"]}, row["owner_email"]))
    return result


def public_project_query():
    return select(*[organizations.c[field] for field in PUBLIC_ORGANIZATION_FIELDS],
                  organizations.c.institution_kind, users.c.email.label("owner_email"),
                  organizations.c.cnpj.label("private_cnpj"), organizations.c.pix_key.label("private_pix_key"),
                  organizations.c.pix_key_verified_at.label("private_pix_key_verified_at"))\
        .join(users, users.c.id == organizations.c.owner_id)


def public_project_list(db) -> list[dict]:
    rows = db.execute(public_project_query().where(organizations.c.institution_kind == "project")
        .order_by(organizations.c.created_at.desc(), organizations.c.id.desc())).mappings()
    return [public_organization_view(db, row) for row in rows]


def donation_view(row, *, include_pix_key: bool = False) -> dict:
    result = {
        "id": row["id"], "project_id": row["project_organization_id"],
        "project_name": row["project_name"], "amount_cents": row["amount_cents"],
        "currency": row["currency"], "payment_method": row["payment_method"],
        "status": row["status"], "end_to_end_id": row["end_to_end_id"],
        "receipt_code": row["receipt_code"], "created_at": row["created_at"],
        "payment_reported_at": row["payment_reported_at"], "confirmed_at": row["confirmed_at"],
        "donor_name": row.get("donor_name"), "donor_cnpj": row.get("donor_cnpj"),
        "donor_document": row.get("donor_document"),
        "donor_document_type": row.get("donor_document_type"),
    }
    if include_pix_key:
        result["pix_key"] = row["pix_key_snapshot"]
    return result


def donation_query():
    return select(
        donations, organizations.c.name.label("project_name"),
        func.coalesce(donor_organizations.c.name, users.c.full_name).label("donor_name"),
        donor_organizations.c.cnpj.label("donor_cnpj"),
        func.coalesce(donor_organizations.c.cnpj, users.c.document).label("donor_document"),
        users.c.account_type.label("donor_document_type"),
    ).join(organizations, organizations.c.id == donations.c.project_organization_id) \
        .join(users, users.c.id == donations.c.donor_user_id) \
        .outerjoin(donor_organizations, (donor_organizations.c.owner_id == donations.c.donor_user_id) & (donor_organizations.c.institution_kind == "donor"))


def receipt_html(row) -> str:
    whole_reais, cents = divmod(row["amount_cents"], 100)
    amount = f"R$ {whole_reais:,}".replace(",", ".") + f",{cents:02d}"
    fields = {
        "Código do comprovante": row["receipt_code"],
        "Data da confirmação": row["confirmed_at"].isoformat(),
        "Doador(a)": row["donor_name"],
        ("CNPJ do doador" if row.get("donor_document_type") == "donor" else "CPF do doador"):
            row.get("donor_document") or "Não informado",
        "Projeto beneficiário": row["project_name"],
        "CNPJ do projeto": row["project_cnpj"] or "Não informado",
        "Valor confirmado": amount,
        "Meio informado": "Pix (transferência direta à beneficiária)",
        "Identificador E2E informado": row["end_to_end_id"],
        "Confirmação registrada por": row["confirmed_by_name"],
    }
    details = "".join(
        f"<dt>{html.escape(label)}</dt><dd>{html.escape(str(value))}</dd>"
        for label, value in fields.items()
    )
    return (
        "<!doctype html><html lang='pt-BR'><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>Comprovante de doação SocialTrade</title>"
        "<style>body{font:16px system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#17211d}"
        "h1{color:#176b4d}dl{display:grid;grid-template-columns:240px 1fr;gap:12px;border-top:1px solid #ddd;padding-top:18px}"
        "dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere}.notice{margin-top:28px;padding:16px;background:#f1f7f3}"
        "@media print{body{margin:0}}</style><body><h1>Registro de doação confirmada</h1>"
        f"<dl>{details}</dl><p class='notice'>A organização beneficiária confirmou o recebimento no SocialTrade. "
        "Este documento é um recibo privado emitido com base nessa confirmação e nos dados informados. "
        "Não é nota fiscal, validação bancária independente, certificação de elegibilidade ou garantia de benefício fiscal.</p>"
        "</body></html>"
    )


@app.get("/")
def index():
    return {"service": "SocialTrade API", "message": "A interface web é servida pelo frontend Next.js."}


@app.get("/public")
def public_page():
    raise HTTPException(status_code=410, detail="Esta interface foi descontinuada. Use a interface principal da SocialTrade.")


@app.get("/health")
@app.get("/api/health")
def health():
    try:
        with connect() as db:
            db.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível.") from error
    return {"status": "ok", "database": "ok", "blockchain": "disabled"}


@app.get("/api/catalog")
def catalog():
    with connect() as db:
        return {**load_catalog(db), "roles": ROLE_LABELS, "demo_users_enabled": DEMO_USERS_ENABLED}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterInput):
    with write_transaction() as db:
        if db.execute(select(users.c.id).where(func.lower(users.c.email) == str(payload.email).lower())).first():
            raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado.")
        if db.execute(select(users.c.id).where(func.lower(users.c.username) == payload.username.lower())).first():
            raise HTTPException(status_code=409, detail="Este usuário já está em uso.")
        if db.execute(select(users.c.id).where(users.c.document == payload.document)).first():
            raise HTTPException(status_code=409, detail="Este CPF já está cadastrado.")
        values = dict(
            full_name=payload.full_name.strip(), username=payload.username, email=str(payload.email).lower(),
            password_hash=hash_password(payload.password), phone=payload.phone, title=payload.responsible_title.strip(),
            role=payload.role, document=payload.document, account_type="person",
        )
        user_id, registration_number = insert_with_generated_value(db, users, values, "registration_number",
            lambda: generate_registration_number(db), "uq_users_registration_number")
        if payload.member_project_id:
            project = db.execute(select(organizations.c.id).where(
                organizations.c.id == payload.member_project_id, organizations.c.institution_kind == "project")).first()
            if not project or not payload.member_role:
                raise HTTPException(status_code=422, detail="Selecione um projeto social e informe se será funcionário ou assistido.")
            db.execute(insert(project_memberships).values(user_id=user_id, organization_id=project.id, member_role=payload.member_role))
    return {"message": "Cadastro concluído. Sua matrícula foi gerada automaticamente.", "registration_number": registration_number}


@app.post("/api/auth/register-institution", status_code=status.HTTP_201_CREATED)
def register_institution(payload: InstitutionRegisterInput):
    data = payload.organization.model_dump()
    data.update(institution_kind=payload.institution_kind, cnpj=payload.document)
    if payload.institution_kind == "donor":
        data.update(areas=[], interested_services=[])
    with write_transaction() as db:
        if db.execute(select(users.c.id).where(func.lower(users.c.email) == str(payload.email).lower())).first():
            raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado.")
        if db.execute(select(users.c.id).where(users.c.document == payload.document)).first():
            raise HTTPException(status_code=409, detail="Este CNPJ já está cadastrado.")
        if db.execute(select(users.c.id).where(func.lower(users.c.username) == payload.document.lower())).first():
            raise HTTPException(status_code=409, detail="Este usuário já está em uso.")
        user_id = db.execute(insert(users).values(
            full_name=payload.full_name.strip(), username=payload.document.lower(), email=str(payload.email).lower(),
            password_hash=hash_password(payload.password), phone=payload.phone, role="member", document=payload.document,
            account_type=payload.institution_kind,
        ).returning(users.c.id)).scalar_one()
        create_org(db, user_id, data)
    return {"message": "Instituição cadastrada. Agora acesse com seu CNPJ e senha."}


@app.post("/api/auth/login")
def login(payload: LoginInput):
    with connect() as db:
        row = db.execute(select(users).where(users.c.document == payload.document)).mappings().first()
    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="CPF/CNPJ ou senha incorretos.")
    if payload.account_type == "donor" and row["account_type"] != "donor":
        raise HTTPException(status_code=403, detail="Esta conta não está cadastrada como empresa doadora.")
    if payload.account_type == "project" and row["account_type"] == "donor":
        raise HTTPException(status_code=403, detail="Acesse pela opção Empresa doadora.")
    user = {key: row[key] for key in ("id", "full_name", "username", "document", "account_type", "registration_number", "email", "phone", "role")}
    user.update(responsible_title=row["title"], role_label=ROLE_LABELS[row["role"]])
    return {"access_token": issue_token(user["id"]), "token_type": "bearer", "user": user}


@app.get("/api/auth/me")
def me(user=Depends(current_user)):
    return {**user, "role_label": ROLE_LABELS[user["role"]]}


@app.get("/api/profile")
def profile(user=Depends(current_user)):
    return {**user, "role_label": ROLE_LABELS[user["role"]]}


@app.patch("/api/profile")
def update_profile(payload: ProfileUpdate, user=Depends(current_user)):
    with transaction() as db:
        db.execute(update(users).where(users.c.id == user["id"]).values(
            full_name=payload.full_name.strip(), phone=payload.phone, title=payload.responsible_title))
    return {"message": "Perfil atualizado."}


@app.get("/api/organizations/mine")
def my_organizations(user=Depends(current_user)):
    with connect() as db:
        ids = db.execute(select(organizations.c.id).where(organizations.c.owner_id == user["id"])
            .order_by(organizations.c.created_at.desc(), organizations.c.id.desc())).scalars().all()
        return [organization_view(db, org_id) for org_id in ids]


@app.get("/api/projects")
def projects(user=Depends(current_user)):
    if user["account_type"] not in {"donor", "person"}:
        raise HTTPException(status_code=403, detail="A consulta de projetos está disponível para doadores.")
    with connect() as db:
        return public_project_list(db)


@app.post("/api/donations", status_code=status.HTTP_201_CREATED)
def create_donation(payload: DonationCreateInput, user=Depends(current_user)):
    if user["account_type"] not in {"donor", "person"}:
        raise HTTPException(status_code=403, detail="Somente empresas ou pessoas físicas podem iniciar uma doação.")
    with write_transaction() as db:
        project = db.execute(select(
            organizations.c.id, organizations.c.name, organizations.c.pix_key,
            organizations.c.cnpj, organizations.c.pix_key_verified_at,
        ).where(
            organizations.c.id == payload.project_id,
            organizations.c.institution_kind == "project",
        )).mappings().first()
        if project is None:
            raise HTTPException(status_code=404, detail="Projeto social não encontrado.")
        pix_key = (project["pix_key"] or "").strip()
        if not pix_key:
            raise HTTPException(status_code=409, detail="Este projeto ainda não cadastrou uma chave Pix para recebimento direto.")
        if not project["cnpj"] or not project["pix_key_verified_at"]:
            raise HTTPException(status_code=409, detail="Este projeto ainda não passou pela conferência cadastral da chave Pix.")
        if user["account_type"] == "donor" and not db.execute(select(organizations.c.id).where(
            organizations.c.owner_id == user["id"], organizations.c.institution_kind == "donor",
        )).first():
            raise HTTPException(status_code=409, detail="A conta da empresa doadora precisa ter um perfil institucional cadastrado.")
        donation_id = db.execute(insert(donations).values(
            donor_user_id=user["id"], project_organization_id=project["id"],
            pix_key_snapshot=pix_key,
            amount_cents=payload.amount_cents,
        ).returning(donations.c.id)).scalar_one()
    return {
        "id": donation_id, "project_id": project["id"], "project_name": project["name"],
        "amount_cents": payload.amount_cents, "currency": "BRL", "payment_method": "pix",
        "status": "awaiting_payment", "pix_key": pix_key,
        "payment_instructions": "Faça a transferência no aplicativo do seu banco diretamente para a chave Pix do projeto. O SocialTrade não recebe nem repassa o valor.",
        "next_step": "Após pagar, informe o identificador E2E. O recibo só será emitido depois que o projeto confirmar o crédito na própria conta.",
    }


@app.get("/api/donations/mine")
def my_donations(user=Depends(current_user)):
    if user["account_type"] in {"donor", "person"}:
        condition = donations.c.donor_user_id == user["id"]
    elif user["account_type"] == "project":
        condition = organizations.c.owner_id == user["id"]
    else:
        raise HTTPException(status_code=403, detail="Esta consulta está disponível para empresas doadoras e projetos sociais.")
    with connect() as db:
        rows = db.execute(donation_query().where(condition)
            .order_by(donations.c.created_at.desc(), donations.c.id.desc())).mappings()
        return [donation_view(row, include_pix_key=user["account_type"] in {"donor", "person"}) for row in rows]


@app.post("/api/donations/{donation_id}/report-payment")
def report_donation_payment(donation_id: int, payload: DonationPaymentReportInput, user=Depends(current_user)):
    if user["account_type"] not in {"donor", "person"}:
        raise HTTPException(status_code=403, detail="Somente quem iniciou a doação pode informar o pagamento.")
    with write_transaction() as db:
        row = db.execute(select(donations.c.status).where(
            donations.c.id == donation_id, donations.c.donor_user_id == user["id"],
        ).with_for_update()).first()
        if row is None:
            raise HTTPException(status_code=404, detail="Doação não encontrada.")
        if row.status != "awaiting_payment":
            raise HTTPException(status_code=409, detail="Esta doação não está aguardando o envio do pagamento.")
        db.execute(update(donations).where(donations.c.id == donation_id).values(
            end_to_end_id=payload.end_to_end_id, status="awaiting_confirmation",
            payment_reported_at=func.now(),
        ))
    return {"id": donation_id, "status": "awaiting_confirmation", "message": "Pagamento informado. O projeto precisa confirmar o crédito na conta antes da emissão do recibo."}


@app.post("/api/donations/{donation_id}/confirm")
def confirm_donation_receipt(donation_id: int, user=Depends(current_user)):
    if user["account_type"] != "project":
        raise HTTPException(status_code=403, detail="Somente o projeto beneficiário pode confirmar o recebimento.")
    with transaction() as db:
        row = db.execute(select(
            donations.c.status, donations.c.project_organization_id,
        ).join(organizations, organizations.c.id == donations.c.project_organization_id).where(
            donations.c.id == donation_id, organizations.c.owner_id == user["id"],
            organizations.c.institution_kind == "project",
        ).with_for_update()).first()
        if row is None:
            raise HTTPException(status_code=404, detail="Doação não encontrada neste projeto.")
        if row.status != "awaiting_confirmation":
            raise HTTPException(status_code=409, detail="A doação precisa estar aguardando confirmação do projeto.")
        receipt_code = str(uuid4())
        db.execute(update(donations).where(donations.c.id == donation_id).values(
            status="confirmed", receipt_code=receipt_code, confirmed_at=func.now(),
            confirmed_by_user_id=user["id"],
        ))
    return {"id": donation_id, "status": "confirmed", "receipt_code": receipt_code, "receipt_url": f"/api/donations/{donation_id}/receipt"}


@app.get("/api/donations/{donation_id}/receipt")
def donation_receipt(donation_id: int, user=Depends(current_user)):
    confirmer = users.alias("confirming_users")
    donor_org = donor_organizations
    with connect() as db:
        row = db.execute(select(
            donations, organizations.c.name.label("project_name"),
            organizations.c.cnpj.label("project_cnpj"), organizations.c.owner_id.label("project_owner_id"),
            func.coalesce(donor_org.c.name, users.c.full_name).label("donor_name"), donor_org.c.cnpj.label("donor_cnpj"),
            func.coalesce(donor_org.c.cnpj, users.c.document).label("donor_document"),
            users.c.account_type.label("donor_document_type"),
            confirmer.c.full_name.label("confirmed_by_name"),
        ).join(organizations, organizations.c.id == donations.c.project_organization_id)
          .join(users, users.c.id == donations.c.donor_user_id)
          .outerjoin(donor_org, (donor_org.c.owner_id == donations.c.donor_user_id) & (donor_org.c.institution_kind == "donor"))
          .outerjoin(confirmer, confirmer.c.id == donations.c.confirmed_by_user_id)
          .where(donations.c.id == donation_id)).mappings().first()
    if row is None or row["status"] != "confirmed":
        raise HTTPException(status_code=404, detail="Comprovante disponível somente após a confirmação do projeto.")
    if user["id"] != row["donor_user_id"] and user["id"] != row["project_owner_id"]:
        raise HTTPException(status_code=403, detail="Este comprovante pertence a outra doação.")
    return Response(
        content=receipt_html(row), media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f'inline; filename="socialtrade-doacao-{donation_id}.html"'},
    )


@app.get("/api/public/projects")
def public_projects():
    with connect() as db:
        return public_project_list(db)


@app.get("/api/projects/open")
def open_projects():
    with connect() as db:
        return list(db.execute(select(organizations.c.id, organizations.c.name, organizations.c.city, organizations.c.state)
            .where(organizations.c.institution_kind == "project").order_by(organizations.c.name, organizations.c.id)).mappings())


@app.get("/api/memberships/mine")
def my_memberships(user=Depends(current_user)):
    with connect() as db:
        return list(db.execute(select(organizations.c.id, organizations.c.name, organizations.c.city, organizations.c.state,
            project_memberships.c.member_role, project_memberships.c.created_at)
            .join(project_memberships, organizations.c.id == project_memberships.c.organization_id)
            .where(project_memberships.c.user_id == user["id"], organizations.c.institution_kind == "project")
            .order_by(organizations.c.name, organizations.c.id)).mappings())


@app.get("/api/public/organizations/{slug}")
def public_organization(slug: str):
    if "\x00" in slug:
        raise HTTPException(status_code=422, detail="O caractere NUL não é permitido no slug.")
    with connect() as db:
        row = db.execute(public_project_query().where(organizations.c.slug == slug)).mappings().first()
        if row is None:
            raise HTTPException(status_code=404, detail="Organização não encontrada.")
        result = public_organization_view(db, row)
        result["services"] = [item for item in load_catalog(db)["services"] if item["status"] == "available"]
        return result


@app.post("/api/organizations", status_code=status.HTTP_201_CREATED)
def add_organization(payload: OrganizationCreate, user=Depends(current_user)):
    if user["account_type"] != "project":
        raise HTTPException(status_code=403, detail="Somente contas de projetos sociais podem cadastrar organizações.")
    if payload.institution_kind != "project":
        raise HTTPException(status_code=422, detail="Contas de projetos sociais só podem cadastrar perfis de projetos.")
    with write_transaction() as db:
        org_id = create_org(db, user["id"], payload.model_dump())
        return organization_view(db, org_id)


@app.patch("/api/organizations/{org_id}")
def update_organization(org_id: int, payload: OrganizationCreate, user=Depends(current_user)):
    data = payload.model_dump()
    with transaction() as db:
        row = db.execute(select(organizations.c.owner_id, organizations.c.institution_kind, organizations.c.cnpj, organizations.c.pix_key)
            .where(organizations.c.id == org_id)).mappings().first()
        if row is None:
            raise HTTPException(status_code=404, detail="Organização não encontrada.")
        if row["owner_id"] != user["id"] or user["account_type"] not in {"project", "donor"} or user["account_type"] != row["institution_kind"]:
            raise HTTPException(status_code=403, detail="Somente o proprietário da instituição pode editar este perfil.")
        if data["institution_kind"] != row["institution_kind"]:
            raise HTTPException(status_code=422, detail="O tipo da instituição não pode ser alterado.")
        if "cnpj" not in payload.model_fields_set:
            data["cnpj"] = row["cnpj"]
        if data["cnpj"] != row["cnpj"]:
            raise HTTPException(status_code=422, detail="O CNPJ não pode ser alterado neste formulário.")
        validate_organization_catalog(db, data)
        organization_values = {field: data[field] for field in EDITABLE_ORGANIZATION_FIELDS}
        if data["pix_key"] != row["pix_key"]:
            organization_values.update(pix_key_verified_at=None, pix_key_verified_by_user_id=None)
        db.execute(update(organizations).where(organizations.c.id == org_id).values(**organization_values))
        replace_organization_relationships(db, org_id, data)
        return organization_view(db, org_id)


@app.get("/api/announcements")
def announcements(user=Depends(current_user)):
    with connect() as db:
        return list(db.execute(select(announcement_table)
            .order_by(announcement_table.c.published_at.desc(), announcement_table.c.id.desc())).mappings())


@app.post("/api/support", status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketInput, user=Depends(current_user)):
    with transaction() as db:
        ticket_id = db.execute(insert(support_tickets).values(user_id=user["id"], subject=payload.subject.strip(),
            message=payload.message.strip()).returning(support_tickets.c.id)).scalar_one()
    return {"id": ticket_id, "message": "Sua solicitação foi enviada para o suporte."}


@app.get("/api/support/mine")
def my_tickets(user=Depends(current_user)):
    with connect() as db:
        return list(db.execute(select(*[support_tickets.c[field] for field in ("id", "subject", "message", "status", "created_at")])
            .where(support_tickets.c.user_id == user["id"])
            .order_by(support_tickets.c.created_at.desc(), support_tickets.c.id.desc())).mappings())


@app.get("/api/moderation/overview")
def moderation_overview(user=Depends(moderator)):
    with connect() as db:
        counts = {
            "users": db.scalar(select(func.count()).select_from(users)),
            "organizations": db.scalar(select(func.count()).select_from(organizations)),
            "open_tickets": db.scalar(select(func.count()).select_from(support_tickets).where(support_tickets.c.status != "resolved")),
        }
        tickets = list(db.execute(select(support_tickets, users.c.full_name, users.c.email)
            .join(users, users.c.id == support_tickets.c.user_id)
            .order_by(support_tickets.c.created_at.desc(), support_tickets.c.id.desc())).mappings())
        return {"counts": counts, "tickets": tickets}


@app.patch("/api/moderation/tickets/{ticket_id}")
def moderate_ticket(ticket_id: int, payload: TicketStatusInput, user=Depends(moderator)):
    with transaction() as db:
        result = db.execute(update(support_tickets).where(support_tickets.c.id == ticket_id).values(status=payload.status))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Solicitação não encontrada.")
    return {"message": "Status da solicitação atualizado."}


@app.post("/api/moderation/announcements", status_code=status.HTTP_201_CREATED)
def publish_announcement(payload: AnnouncementInput, user=Depends(moderator)):
    with transaction() as db:
        announcement_id = db.execute(insert(announcement_table).values(title=payload.title.strip(), body=payload.body.strip(),
            category=payload.category.strip()).returning(announcement_table.c.id)).scalar_one()
    return {"id": announcement_id, "message": "Aviso publicado."}


@app.get("/api/moderation/projects/pix-review")
def pix_review_queue(user=Depends(moderator)):
    with connect() as db:
        rows = db.execute(select(
            organizations.c.id, organizations.c.name, organizations.c.cnpj,
            organizations.c.pix_key, organizations.c.pix_key_verified_at,
            organizations.c.owner_id, users.c.full_name.label("owner_name"),
        ).join(users, users.c.id == organizations.c.owner_id).where(
            organizations.c.institution_kind == "project", organizations.c.pix_key.is_not(None),
        ).order_by(organizations.c.created_at.desc(), organizations.c.id.desc())).mappings()
        return [dict(row) for row in rows]


@app.patch("/api/moderation/projects/{org_id}/pix-verification")
def verify_project_pix_key(org_id: int, payload: PixVerificationInput, user=Depends(moderator)):
    with transaction() as db:
        row = db.execute(select(
            organizations.c.owner_id, organizations.c.institution_kind,
            organizations.c.cnpj, organizations.c.pix_key,
        ).where(organizations.c.id == org_id).with_for_update()).mappings().first()
        if row is None or row["institution_kind"] != "project":
            raise HTTPException(status_code=404, detail="Projeto social não encontrado.")
        if row["owner_id"] == user["id"]:
            raise HTTPException(status_code=403, detail="A conferência deve ser feita por uma pessoa moderadora que não seja proprietária do projeto.")
        if payload.verified and (not row["cnpj"] or not row["pix_key"] or not row["pix_key"].strip()):
            raise HTTPException(status_code=409, detail="O projeto precisa informar CNPJ e chave Pix antes da conferência.")
        db.execute(update(organizations).where(organizations.c.id == org_id).values(
            pix_key_verified_at=func.now() if payload.verified else None,
            pix_key_verified_by_user_id=user["id"] if payload.verified else None,
        ))
    return {"organization_id": org_id, "pix_key_verified": payload.verified}
