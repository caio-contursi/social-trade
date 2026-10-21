import re
import secrets
import unicodedata
from contextlib import contextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.exc import IntegrityError

from app.auth import current_user, moderator
from app.catalog import ROLE_LABELS, get_catalog_codes, load_catalog
from app.config import DEMO_USERS_ENABLED
from app.database import connect, transaction
from app.models import (
    announcements as announcement_table, organization_areas, organization_services,
    organizations, project_memberships, support_tickets, users,
)
from app.schemas import AnnouncementInput, InstitutionRegisterInput, LoginInput, OrganizationCreate, ProfileUpdate, RegisterInput, TicketInput, TicketStatusInput
from app.security import hash_password, issue_token, verify_password


app = FastAPI(title="SocialTrade", version="0.1.0", description="Cadastro e acompanhamento de organizações sociais.")
STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/assets", StaticFiles(directory=STATIC_DIR), name="assets")
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
    values.update(owner_id=owner_id, name=data["name"].strip(), slug=unique_slug(db, data["name"]),
                  institution_kind=data.get("institution_kind", "project"), city=data["city"].strip(),
                  state=data["state"].upper(), short_description=data["short_description"].strip())
    org_id = db.execute(insert(organizations).values(**values).returning(organizations.c.id)).scalar_one()
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
        "is_demo": owner_email.strip().lower().endswith("@socialtrade.local"),
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
    result.update(organization_profile_metadata(result, owner_email))
    return result


def public_organization_view(db, row) -> dict:
    result = {key: row[key] for key in PUBLIC_ORGANIZATION_FIELDS}
    result["areas"] = list(db.execute(select(organization_areas.c.area_code)
        .where(organization_areas.c.organization_id == row["id"]).order_by(organization_areas.c.area_code)).scalars())
    result.update(organization_profile_metadata({**result, "institution_kind": row["institution_kind"]}, row["owner_email"]))
    return result


def public_project_query():
    return select(*[organizations.c[field] for field in PUBLIC_ORGANIZATION_FIELDS],
                  organizations.c.institution_kind, users.c.email.label("owner_email"))\
        .join(users, users.c.id == organizations.c.owner_id)


def public_project_list(db) -> list[dict]:
    rows = db.execute(public_project_query().where(organizations.c.institution_kind == "project")
        .order_by(organizations.c.created_at.desc(), organizations.c.id.desc())).mappings()
    return [public_organization_view(db, row) for row in rows]


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/public")
def public_page():
    return FileResponse(STATIC_DIR / "public.html")


@app.get("/health")
def health():
    return {"status": "ok", "blockchain": "disabled"}


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
        registration_number = generate_registration_number(db)
        user_id = db.execute(insert(users).values(
            full_name=payload.full_name.strip(), username=payload.username, email=str(payload.email).lower(),
            password_hash=hash_password(payload.password), phone=payload.phone, title=payload.responsible_title.strip(),
            role=payload.role, document=payload.document, account_type="person", registration_number=registration_number,
        ).returning(users.c.id)).scalar_one()
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
    if user["account_type"] != "donor":
        raise HTTPException(status_code=403, detail="A consulta de projetos para investimento é exclusiva de empresas doadoras.")
    with connect() as db:
        return public_project_list(db)


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
        row = db.execute(select(organizations.c.owner_id, organizations.c.institution_kind, organizations.c.cnpj)
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
        db.execute(update(organizations).where(organizations.c.id == org_id)
            .values(**{field: data[field] for field in EDITABLE_ORGANIZATION_FIELDS}))
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
