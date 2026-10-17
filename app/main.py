import re
import secrets
import unicodedata
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.auth import current_user, moderator
from app.catalog import AREAS, ORGANIZATION_TYPES, ROLE_LABELS, SERVICES
from app.config import DEMO_USERS_ENABLED
from app.database import connect, initialize, transaction
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


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-") or "organizacao"


def unique_slug(db, name: str) -> str:
    base = slugify(name)[:140]
    candidate = base
    number = 2
    while db.execute("SELECT id FROM organizations WHERE slug=?", (candidate,)).fetchone():
        candidate = f"{base[:135]}-{number}"
        number += 1
    return candidate


def generate_registration_number(db) -> str:
    while True:
        number = f"{secrets.randbelow(1_000_000):06d}"
        if not db.execute("SELECT id FROM users WHERE registration_number=?", (number,)).fetchone():
            return number


def validate_organization_catalog(data: dict) -> None:
    area_codes = {item["code"] for item in AREAS}
    service_codes = {item["code"] for item in SERVICES}
    if unknown := set(data["areas"]) - area_codes:
        raise HTTPException(status_code=422, detail=f"Áreas desconhecidas: {', '.join(sorted(unknown))}")
    if unknown := set(data.get("interested_services", [])) - service_codes:
        raise HTTPException(status_code=422, detail=f"Serviços desconhecidos: {', '.join(sorted(unknown))}")


def create_org(db, owner_id: int, data: dict) -> int:
    validate_organization_catalog(data)
    cursor = db.execute(
        """INSERT INTO organizations (owner_id,name,slug,organization_type,institution_kind,cnpj,city,state,founding_year,
           short_description,objective,impact_summary,description,website_url,instagram_url,pix_key,logo_url)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (owner_id, data["name"].strip(), unique_slug(db, data["name"]), data["organization_type"], data.get("institution_kind", "project"), data.get("cnpj"),
         data["city"].strip(), data["state"].upper(), data.get("founding_year"), data["short_description"].strip(),
         data.get("objective"), data.get("impact_summary"), data.get("description"), data.get("website_url"), data.get("instagram_url"), data.get("pix_key"), data.get("logo_url")),
    )
    org_id = cursor.lastrowid
    db.executemany("INSERT INTO organization_areas (organization_id,area_code) VALUES (?,?)", [(org_id, code) for code in dict.fromkeys(data.get("areas", []))])
    db.executemany(
        "INSERT INTO organization_services (organization_id,service_code,interested) VALUES (?,?,1)",
        [(org_id, code) for code in dict.fromkeys(data.get("interested_services", []))],
    )
    return org_id


def organization_profile_metadata(data: dict, owner_email: str) -> dict:
    """Measure presentation completeness, never identity or financial verification.

    Count name, type, city, state, summary, description, logo and a website/social
    link equally; projects also count objectives, impact and at least one cause.
    """
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
    row = db.execute(
        "SELECT o.*,u.email AS owner_email FROM organizations o JOIN users u ON u.id=o.owner_id WHERE o.id=?",
        (org_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Organização não encontrada.")
    result = dict(row)
    owner_email = result.pop("owner_email")
    result["areas"] = [r[0] for r in db.execute("SELECT area_code FROM organization_areas WHERE organization_id=? ORDER BY area_code", (org_id,))]
    selected = {r[0] for r in db.execute("SELECT service_code FROM organization_services WHERE organization_id=?", (org_id,))}
    result["services"] = [{**item, "interested": item["code"] in selected} for item in SERVICES]
    result.update(organization_profile_metadata(result, owner_email))
    return result


def public_organization_view(db, row) -> dict:
    result = {key: row[key] for key in PUBLIC_ORGANIZATION_FIELDS}
    result["areas"] = [item[0] for item in db.execute(
        "SELECT area_code FROM organization_areas WHERE organization_id=? ORDER BY area_code", (row["id"],),
    )]
    result.update(organization_profile_metadata({**result, "institution_kind": row["institution_kind"]}, row["owner_email"]))
    return result


def public_project_list(db) -> list[dict]:
    columns = ",".join(f"o.{field}" for field in PUBLIC_ORGANIZATION_FIELDS)
    rows = db.execute(
        f"SELECT {columns},o.institution_kind,u.email AS owner_email FROM organizations o "
        "JOIN users u ON u.id=o.owner_id WHERE o.institution_kind='project' ORDER BY o.created_at DESC,o.id DESC",
    ).fetchall()
    return [public_organization_view(db, row) for row in rows]


def seed_demo_users() -> None:
    if not DEMO_USERS_ENABLED:
        return
    users = [
        ("Usuário Um", "user1@socialtrade.local", "user1", "member", "11111111111", "person"),
        ("Usuário Dois", "user2@socialtrade.local", "user2", "member", "22222222222", "person"),
        ("Moderador", "mod@socialtrade.local", "mod", "moderator", "33333333333", "person"),
        ("Voluntário", "voluntario@socialtrade.local", "voluntario", "volunteer", "44444444444", "person"),
        ("Empresa Doadora", "doador@socialtrade.local", "doador", "member", "12345678000195", "donor"),
    ]
    with transaction() as db:
        for name, email, username, role, document, account_type in users:
            legacy_email = email.replace("@socialtrade.local", "@impactledger.local")
            exists = db.execute(
                "SELECT id FROM users WHERE email IN (?,?) OR username=? ORDER BY CASE WHEN email=? THEN 0 WHEN email=? THEN 1 ELSE 2 END LIMIT 1",
                (email, legacy_email, username, email, legacy_email),
            ).fetchone()
            if not exists:
                db.execute("INSERT INTO users (full_name,username,email,password_hash,role,document,account_type) VALUES (?,?,?,?,?,?,?)",
                (name, username, email, hash_password("SocialTrade123!"), role, document, account_type))
            else:
                db.execute("UPDATE users SET full_name=?,username=?,email=?,password_hash=?,role=?,document=COALESCE(document,?),account_type=? WHERE id=?",
                    (name, username, email, hash_password("SocialTrade123!"), role, document, account_type, exists["id"]))
        for row in db.execute("SELECT id FROM users WHERE account_type='person' AND registration_number IS NULL").fetchall():
            db.execute("UPDATE users SET registration_number=? WHERE id=?", (generate_registration_number(db), row["id"]))
        first_user = db.execute("SELECT id FROM users WHERE email='user1@socialtrade.local'").fetchone()
        if first_user and not db.execute("SELECT id FROM organizations WHERE owner_id=?", (first_user["id"],)).fetchone():
            create_org(db, first_user["id"], {
                "name": "Instituto Mãos Unidas", "organization_type": "independent_project", "cnpj": None,
                "institution_kind": "project", "objective": "Ampliar o acesso de famílias a alimentação e educação.",
                "impact_summary": "Distribuição mensal de cestas e oficinas para crianças e adolescentes.",
                "city": "São Paulo", "state": "SP", "founding_year": 2021,
                "short_description": "Apoio comunitário e distribuição de alimentos para famílias da região.",
                "description": "Uma iniciativa local que aproxima doações de quem mais precisa.",
                "website_url": None, "instagram_url": None, "pix_key": None, "logo_url": None,
                "areas": ["food", "education"], "interested_services": ["public_profile", "campaigns"],
            })
            db.execute("INSERT OR IGNORE INTO project_memberships (user_id,organization_id,member_role) SELECT ?,id,'staff' FROM organizations WHERE owner_id=? LIMIT 1", (first_user["id"], first_user["id"]))
        donor = db.execute("SELECT id FROM users WHERE email='doador@socialtrade.local'").fetchone()
        if donor and not db.execute("SELECT id FROM organizations WHERE owner_id=?", (donor["id"],)).fetchone():
            create_org(db, donor["id"], {
                "name": "Empresa Doadora Exemplo", "organization_type": "association", "institution_kind": "donor", "cnpj": "12345678000195",
                "city": "São Paulo", "state": "SP", "founding_year": None,
                "short_description": "Empresa que investe em projetos sociais com transparência.",
                "objective": None, "impact_summary": None, "description": "Conta de demonstração de empresa apoiadora.",
                "website_url": None, "instagram_url": None, "pix_key": None, "logo_url": None,
                "areas": [], "interested_services": [],
            })


initialize()
seed_demo_users()


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
    return {"organization_types": ORGANIZATION_TYPES, "areas": AREAS, "services": SERVICES, "roles": ROLE_LABELS, "demo_users_enabled": DEMO_USERS_ENABLED}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterInput):
    data = payload.model_dump()
    with transaction() as db:
        if db.execute("SELECT id FROM users WHERE email=? COLLATE NOCASE", (str(payload.email),)).fetchone():
            raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado.")
        if db.execute("SELECT id FROM users WHERE username=? COLLATE NOCASE", (payload.username,)).fetchone():
            raise HTTPException(status_code=409, detail="Este usuário já está em uso.")
        if db.execute("SELECT id FROM users WHERE document=?", (payload.document,)).fetchone():
            raise HTTPException(status_code=409, detail="Este CPF já está cadastrado.")
        registration_number = generate_registration_number(db)
        cursor = db.execute("INSERT INTO users (full_name,username,email,password_hash,phone,title,role,document,account_type,registration_number) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            (payload.full_name.strip(), payload.username, str(payload.email).lower(), hash_password(payload.password), payload.phone, payload.responsible_title.strip(), payload.role, payload.document, "person", registration_number))
        user_id = cursor.lastrowid
        if payload.member_project_id:
            project = db.execute("SELECT id FROM organizations WHERE id=? AND institution_kind='project'", (payload.member_project_id,)).fetchone()
            if not project or not payload.member_role:
                raise HTTPException(status_code=422, detail="Selecione um projeto social e informe se será funcionário ou assistido.")
            db.execute("INSERT INTO project_memberships (user_id,organization_id,member_role) VALUES (?,?,?)", (user_id, project["id"], payload.member_role))
    return {"message": "Cadastro concluído. Sua matrícula foi gerada automaticamente.", "registration_number": registration_number}


@app.post("/api/auth/register-institution", status_code=status.HTTP_201_CREATED)
def register_institution(payload: InstitutionRegisterInput):
    data = payload.organization.model_dump()
    data["institution_kind"] = payload.institution_kind
    data["cnpj"] = payload.document
    if payload.institution_kind == "donor":
        data["areas"] = []
        data["interested_services"] = []
    with transaction() as db:
        if db.execute("SELECT id FROM users WHERE email=? COLLATE NOCASE", (str(payload.email),)).fetchone():
            raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado.")
        if db.execute("SELECT id FROM users WHERE document=?", (payload.document,)).fetchone():
            raise HTTPException(status_code=409, detail="Este CNPJ já está cadastrado.")
        username = payload.document
        role = "member"
        account_type = payload.institution_kind
        cursor = db.execute("INSERT INTO users (full_name,username,email,password_hash,phone,role,document,account_type) VALUES (?,?,?,?,?,?,?,?)",
                            (payload.full_name.strip(), username, str(payload.email).lower(), hash_password(payload.password), payload.phone, role, payload.document, account_type))
        user_id = cursor.lastrowid
        create_org(db, user_id, data)
    return {"message": "Instituição cadastrada. Agora acesse com seu CNPJ e senha."}


@app.post("/api/auth/login")
def login(payload: LoginInput):
    db = connect()
    try:
        row = db.execute("SELECT * FROM users WHERE document=?", (payload.document,)).fetchone()
    finally:
        db.close()
    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="CPF/CNPJ ou senha incorretos.")
    if payload.account_type == "donor" and row["account_type"] != "donor":
        raise HTTPException(status_code=403, detail="Esta conta não está cadastrada como empresa doadora.")
    if payload.account_type == "project" and row["account_type"] == "donor":
        raise HTTPException(status_code=403, detail="Acesse pela opção Empresa doadora.")
    user = {"id": row["id"], "full_name": row["full_name"], "username": row["username"], "document": row["document"], "account_type": row["account_type"], "registration_number": row["registration_number"], "email": row["email"], "phone": row["phone"], "responsible_title": row["title"], "role": row["role"], "role_label": ROLE_LABELS[row["role"]]}
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
        db.execute("UPDATE users SET full_name=?, phone=?, title=? WHERE id=?", (payload.full_name.strip(), payload.phone, payload.responsible_title, user["id"]))
    return {"message": "Perfil atualizado."}


@app.get("/api/organizations/mine")
def my_organizations(user=Depends(current_user)):
    db = connect()
    try:
        ids = [row[0] for row in db.execute("SELECT id FROM organizations WHERE owner_id=? ORDER BY created_at DESC", (user["id"],))]
        return [organization_view(db, org_id) for org_id in ids]
    finally:
        db.close()


@app.get("/api/projects")
def projects(user=Depends(current_user)):
    if user["account_type"] != "donor":
        raise HTTPException(status_code=403, detail="A consulta de projetos para investimento é exclusiva de empresas doadoras.")
    db = connect()
    try:
        return public_project_list(db)
    finally:
        db.close()


@app.get("/api/public/projects")
def public_projects():
    db = connect()
    try:
        return public_project_list(db)
    finally:
        db.close()


@app.get("/api/projects/open")
def open_projects():
    db = connect()
    try:
        return [dict(row) for row in db.execute("SELECT id,name,city,state FROM organizations WHERE institution_kind='project' ORDER BY name")]
    finally:
        db.close()


@app.get("/api/memberships/mine")
def my_memberships(user=Depends(current_user)):
    db = connect()
    try:
        return [dict(row) for row in db.execute(
            """SELECT o.id,o.name,o.city,o.state,m.member_role,m.created_at
               FROM project_memberships m JOIN organizations o ON o.id=m.organization_id
               WHERE m.user_id=? AND o.institution_kind='project' ORDER BY o.name""",
            (user["id"],),
        )]
    finally:
        db.close()


@app.get("/api/public/organizations/{slug}")
def public_organization(slug: str):
    db = connect()
    try:
        columns = ",".join(f"o.{field}" for field in PUBLIC_ORGANIZATION_FIELDS)
        row = db.execute(
            f"SELECT {columns},o.institution_kind,u.email AS owner_email FROM organizations o "
            "JOIN users u ON u.id=o.owner_id WHERE o.slug=?", (slug,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Organização não encontrada.")
        result = public_organization_view(db, row)
        result["services"] = [item for item in SERVICES if item["status"] == "available"]
        return result
    finally:
        db.close()


@app.post("/api/organizations", status_code=status.HTTP_201_CREATED)
def add_organization(payload: OrganizationCreate, user=Depends(current_user)):
    if user["account_type"] != "project":
        raise HTTPException(status_code=403, detail="Somente contas de projetos sociais podem cadastrar organizações.")
    if payload.institution_kind != "project":
        raise HTTPException(status_code=422, detail="Contas de projetos sociais só podem cadastrar perfis de projetos.")
    with transaction() as db:
        org_id = create_org(db, user["id"], payload.model_dump())
    db = connect()
    try:
        return organization_view(db, org_id)
    finally:
        db.close()


@app.patch("/api/organizations/{org_id}")
def update_organization(org_id: int, payload: OrganizationCreate, user=Depends(current_user)):
    data = payload.model_dump()
    with transaction() as db:
        row = db.execute("SELECT owner_id,institution_kind FROM organizations WHERE id=?", (org_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Organização não encontrada.")
        if row["owner_id"] != user["id"] or user["account_type"] not in {"project", "donor"} or user["account_type"] != row["institution_kind"]:
            raise HTTPException(status_code=403, detail="Somente o proprietário da instituição pode editar este perfil.")
        if data["institution_kind"] != row["institution_kind"]:
            raise HTTPException(status_code=422, detail="O tipo da instituição não pode ser alterado.")
        validate_organization_catalog(data)
        assignments = ",".join(f"{field}=?" for field in EDITABLE_ORGANIZATION_FIELDS)
        db.execute(f"UPDATE organizations SET {assignments} WHERE id=?", (*[data[field] for field in EDITABLE_ORGANIZATION_FIELDS], org_id))
        db.execute("DELETE FROM organization_areas WHERE organization_id=?", (org_id,))
        db.executemany("INSERT INTO organization_areas (organization_id,area_code) VALUES (?,?)", [(org_id, code) for code in data["areas"]])
        db.execute("DELETE FROM organization_services WHERE organization_id=?", (org_id,))
        db.executemany(
            "INSERT INTO organization_services (organization_id,service_code,interested) VALUES (?,?,1)",
            [(org_id, code) for code in dict.fromkeys(data["interested_services"])],
        )
        return organization_view(db, org_id)


@app.get("/api/announcements")
def announcements(user=Depends(current_user)):
    db = connect()
    try:
        return [dict(row) for row in db.execute("SELECT * FROM announcements ORDER BY published_at DESC, id DESC")]
    finally:
        db.close()


@app.post("/api/support", status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketInput, user=Depends(current_user)):
    with transaction() as db:
        cursor = db.execute("INSERT INTO support_tickets (user_id,subject,message) VALUES (?,?,?)",
                            (user["id"], payload.subject.strip(), payload.message.strip()))
        ticket_id = cursor.lastrowid
    return {"id": ticket_id, "message": "Sua solicitação foi enviada para o suporte."}


@app.get("/api/support/mine")
def my_tickets(user=Depends(current_user)):
    db = connect()
    try:
        return [dict(row) for row in db.execute("SELECT id,subject,message,status,created_at FROM support_tickets WHERE user_id=? ORDER BY created_at DESC", (user["id"],))]
    finally:
        db.close()


@app.get("/api/moderation/overview")
def moderation_overview(user=Depends(moderator)):
    db = connect()
    try:
        counts = {
            "users": db.execute("SELECT COUNT(*) FROM users").fetchone()[0],
            "organizations": db.execute("SELECT COUNT(*) FROM organizations").fetchone()[0],
            "open_tickets": db.execute("SELECT COUNT(*) FROM support_tickets WHERE status!='resolved'").fetchone()[0],
        }
        tickets = [dict(row) for row in db.execute("SELECT t.*,u.full_name,u.email FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC")]
        return {"counts": counts, "tickets": tickets}
    finally:
        db.close()


@app.patch("/api/moderation/tickets/{ticket_id}")
def moderate_ticket(ticket_id: int, payload: TicketStatusInput, user=Depends(moderator)):
    with transaction() as db:
        result = db.execute("UPDATE support_tickets SET status=? WHERE id=?", (payload.status, ticket_id))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Solicitação não encontrada.")
    return {"message": "Status da solicitação atualizado."}


@app.post("/api/moderation/announcements", status_code=status.HTTP_201_CREATED)
def publish_announcement(payload: AnnouncementInput, user=Depends(moderator)):
    with transaction() as db:
        cursor = db.execute("INSERT INTO announcements (title,body,category) VALUES (?,?,?)",
                            (payload.title.strip(), payload.body.strip(), payload.category.strip()))
    return {"id": cursor.lastrowid, "message": "Aviso publicado."}
