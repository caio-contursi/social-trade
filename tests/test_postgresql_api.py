"""Migration contracts exercised against PostgreSQL and the real API."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import importlib
import os
from pathlib import Path
import subprocess
import sys
from threading import Barrier
from uuid import uuid4

import pytest
from sqlalchemy import func, insert, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.schema import CreateSchema, DropSchema

PASSWORD = "LocalTestPassword123!"
ALPHANUMERIC_CNPJ = "12ABC34501DE35"


def test_database_errors_do_not_render_password_hash_parameters(api, user_factory, password_hash):
    owner = user_factory()
    with pytest.raises(IntegrityError) as caught:
        with api.transaction() as db:
            username = db.scalar(select(api.users.c.username).where(api.users.c.id == owner["id"]))
            db.execute(insert(api.users).values(
                full_name="Pessoa fictícia", username=username, email="different@example.org", password_hash=password_hash,
                document="11144477735", account_type="person", registration_number="999999",
            ))
    assert "SQL parameters hidden" in str(caught.value)
    assert password_hash not in str(caught.value)


def test_importing_application_never_creates_schema_or_seeds(pytestconfig):
    schema = "st_startup_" + uuid4().hex
    admin = pytestconfig._socialtrade_admin_engine
    with admin.begin() as db:
        db.execute(CreateSchema(schema))
    try:
        environment = {**os.environ, "SOCIALTRADE_DATABASE_SCHEMA": schema, "SOCIALTRADE_DEMO_USERS": "true"}
        result = subprocess.run([sys.executable, "-c", "import app.main"], env=environment,
            cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True, timeout=30)
        assert result.returncode == 0, result.stderr
        with admin.connect() as db:
            assert db.scalar(text("SELECT count(*) FROM information_schema.tables WHERE table_schema=:schema"), {"schema": schema}) == 0
    finally:
        with admin.begin() as db:
            db.execute(DropSchema(schema, cascade=True))


def test_alphanumeric_cnpj_registration_login_and_unchanged_patch(client, institution_data):
    payload = institution_data(document="12.abc.345/01de-35")
    payload["organization"]["cnpj"] = "12.abc.345/01de-35"
    assert client.post("/api/auth/register-institution", json=payload).status_code == 201
    login = client.post("/api/auth/login", json={
        "document": "12.abc.345/01de-35", "password": PASSWORD, "account_type": "project",
    })
    assert login.status_code == 200
    assert login.json()["user"]["document"] == ALPHANUMERIC_CNPJ
    assert login.json()["user"]["username"] == ALPHANUMERIC_CNPJ.lower()
    headers = {"Authorization": "Bearer " + login.json()["access_token"]}
    organization = client.get("/api/organizations/mine", headers=headers).json()[0]
    assert organization["cnpj"] == ALPHANUMERIC_CNPJ
    response = client.patch(f"/api/organizations/{organization['id']}", headers=headers, json=payload["organization"])
    assert response.status_code == 200, response.text
    assert response.json()["cnpj"] == ALPHANUMERIC_CNPJ


@pytest.mark.parametrize("document", [
    "12ABC34501DE36", "12ABC34501DEAA", "12#ABC34501DE35", "12 ABC34501DE35",
    "12/ABC/345/01DE/35", "１２ABC34501DE35", "529x982x247x25", "529.982.247-25x",
])
def test_document_validation_never_discards_arbitrary_characters(client, institution_data, document, api):
    response = client.post("/api/auth/register-institution", json=institution_data(document=document))
    assert response.status_code == 422
    # Login permits legacy check digits, but still rejects nonstandard syntax.
    if document not in {"12ABC34501DE36", "529x982x247x25"}:
        assert client.post("/api/auth/login", json={"document": document, "password": PASSWORD}).status_code == 422
    with api.transaction() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 0


def test_username_collision_with_institution_document_returns_409(client, institution_data, user_factory, api):
    user_factory(username=ALPHANUMERIC_CNPJ.lower())
    response = client.post("/api/auth/register-institution", json=institution_data(document=ALPHANUMERIC_CNPJ))
    assert response.status_code == 409
    with api.transaction() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 1
        assert db.scalar(select(func.count()).select_from(api.organizations)) == 0


def test_concurrent_institution_registration_is_atomic_and_returns_conflict(
    client, institution_data, api, monkeypatch, password_hash,
):
    # Both requests finish their existence checks before either inserts a user.
    barrier = Barrier(2)
    def hash_after_both_prechecks(password):
        barrier.wait(timeout=15)
        return password_hash
    monkeypatch.setattr(api, "hash_password", hash_after_both_prechecks)
    payload = institution_data(document=ALPHANUMERIC_CNPJ)
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(lambda _: client.post("/api/auth/register-institution", json=payload), range(2)))
    assert sorted(response.status_code for response in responses) == [201, 409]
    with api.transaction() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 1
        assert db.scalar(select(func.count()).select_from(api.organizations)) == 1
        assert db.scalar(select(func.count()).select_from(api.organization_areas)) == 2


def test_concurrent_distinct_institutions_with_same_name_both_register(
    client, institution_data, api, monkeypatch, password_hash,
):
    barrier = Barrier(2)
    calls = iter(range(100))
    original = api.unique_slug
    def choose_before_either_insert(db, name):
        synchronize = next(calls) < 2
        slug = original(db, name)
        if synchronize:
            barrier.wait(timeout=15)
        return slug
    monkeypatch.setattr(api, "unique_slug", choose_before_either_insert)
    monkeypatch.setattr(api, "hash_password", lambda _: password_hash)
    payloads = [institution_data(document=document, email=f"race{index}@example.org")
        for index, document in enumerate(("11222333000181", "11444777000161"))]
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(lambda payload: client.post("/api/auth/register-institution", json=payload), payloads))
    assert [response.status_code for response in responses] == [201, 201]
    with api.connect() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 2
        assert set(db.execute(select(api.organizations.c.slug)).scalars()) == {"projeto-de-teste", "projeto-de-teste-2"}
        assert db.scalar(select(func.count()).select_from(api.organization_areas)) == 4


def test_concurrent_distinct_people_retry_colliding_generated_matricula(
    client, person_data, api, monkeypatch, password_hash,
):
    barrier = Barrier(2)
    calls = iter(range(100))
    numbers = iter((123456, 123456, 123457))
    original = api.generate_registration_number
    def choose_before_either_insert(db):
        synchronize = next(calls) < 2
        number = original(db)
        if synchronize:
            barrier.wait(timeout=15)
        return number
    monkeypatch.setattr(api, "generate_registration_number", choose_before_either_insert)
    monkeypatch.setattr(api.secrets, "randbelow", lambda _: next(numbers))
    monkeypatch.setattr(api, "hash_password", lambda _: password_hash)
    payloads = [person_data(document=document, username=f"race_{index}", email=f"race{index}@example.org")
        for index, document in enumerate(("52998224725", "11144477735"))]
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(lambda payload: client.post("/api/auth/register", json=payload), payloads))
    assert [response.status_code for response in responses] == [201, 201]
    assert {response.json()["registration_number"] for response in responses} == {"123456", "123457"}
    with api.connect() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 2
        assert set(db.execute(select(api.users.c.document)).scalars()) == {"52998224725", "11144477735"}


def test_concurrent_person_identity_conflict_still_returns_409(
    client, person_data, api, monkeypatch, password_hash,
):
    barrier = Barrier(2)
    def hash_after_both_prechecks(password):
        barrier.wait(timeout=15)
        return password_hash
    monkeypatch.setattr(api, "hash_password", hash_after_both_prechecks)
    payload = person_data()
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(lambda _: client.post("/api/auth/register", json=payload), range(2)))
    assert sorted(response.status_code for response in responses) == [201, 409]
    with api.connect() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 1


@pytest.mark.parametrize("generated_field", ["slug", "registration_number"])
def test_generated_value_retry_is_bounded_and_rolls_back_incomplete_registration(
    client, api, user_factory, organization_factory, institution_data, person_data, monkeypatch, generated_field,
):
    if generated_field == "slug":
        owner = user_factory(kind="project")
        organization_factory(owner, name="Nome ocupado")
        monkeypatch.setattr(api, "unique_slug", lambda *args: "nome-ocupado")
        endpoint, payload = "/api/auth/register-institution", institution_data()
    else:
        user_factory()
        monkeypatch.setattr(api, "generate_registration_number", lambda *args: "000001")
        endpoint, payload = "/api/auth/register", person_data()
    response = client.post(endpoint, json=payload)
    assert response.status_code == 503
    assert response.json() == {"detail": "Não foi possível concluir o cadastro. Tente novamente."}
    with api.connect() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 1
        assert db.scalar(select(func.count()).select_from(api.organizations)) == (generated_field == "slug")


@pytest.mark.parametrize("existing,new", [
    ("11222333000181", "11444777000161"), ("11222333000181", None), (None, "11444777000161"),
])
def test_profile_patch_cannot_change_institution_identity(
    client, user_factory, organization_factory, organization_data, login, existing, new,
):
    owner = user_factory(kind="project")
    organization = organization_factory(owner, cnpj=existing)
    headers = login(owner)
    before = client.get("/api/organizations/mine", headers=headers).json()[0]
    response = client.patch(f"/api/organizations/{organization['id']}", headers=headers,
        json=organization_data(cnpj=new, name="Nome que não deve ser salvo"))
    assert response.status_code == 422
    assert client.get("/api/organizations/mine", headers=headers).json()[0] == before
    omitted = organization_data(name="Nome atualizado")
    del omitted["cnpj"]
    allowed = client.patch(f"/api/organizations/{organization['id']}", headers=headers, json=omitted)
    assert allowed.status_code == 200
    assert allowed.json()["cnpj"] == existing


def test_catalog_database_is_the_source_of_labels_status_and_valid_codes(
    api, client, user_factory, login, organization_data,
):
    models = importlib.import_module("app.models")
    with api.transaction() as db:
        original_service = dict(db.execute(select(models.services)
            .where(models.services.c.code == "public_profile")).mappings().one())
    try:
        with api.transaction() as db:
            db.execute(insert(models.organization_types).values(code="new_type", name="Novo tipo"))
            db.execute(insert(models.areas).values(code="new_area", name="Nova área"))
            db.execute(insert(models.services).values(code="new_service", name="Novo serviço", availability="future"))
            db.execute(update(models.services).where(models.services.c.code == "public_profile")
                .values(name="Perfil atualizado no banco", availability="coming_soon"))
        catalog = client.get("/api/catalog").json()
        assert {"code": "new_type", "label": "Novo tipo"} in catalog["organization_types"]
        assert {"code": "new_area", "label": "Nova área"} in catalog["areas"]
        assert {"code": "new_service", "label": "Novo serviço", "status": "future"} in catalog["services"]
        assert {"code": "public_profile", "label": "Perfil atualizado no banco", "status": "coming_soon"} in catalog["services"]
        owner = user_factory(kind="project")
        response = client.post("/api/organizations", headers=login(owner), json=organization_data(
            organization_type="new_type", areas=["new_area"], interested_services=["new_service"],
        ))
        assert response.status_code == 201, response.text
        assert response.json()["areas"] == ["new_area"]
        assert [item["code"] for item in response.json()["services"] if item["interested"]] == ["new_service"]
        public = client.get("/api/public/organizations/" + response.json()["slug"]).json()
        assert "public_profile" not in [item["code"] for item in public["services"]]
    finally:
        # The test's catalog changes are scoped too; normal fixtures keep catalogs.
        from sqlalchemy import delete
        with api.transaction() as db:
            db.execute(delete(models.organizations))
            db.execute(delete(models.organization_types).where(models.organization_types.c.code == "new_type"))
            db.execute(delete(models.areas).where(models.areas.c.code == "new_area"))
            db.execute(delete(models.services).where(models.services.c.code == "new_service"))
            db.execute(update(models.services).where(models.services.c.code == "public_profile")
                .values(name=original_service["name"], availability=original_service["availability"]))


def test_dates_have_explicit_utc_and_list_order_has_id_tiebreaker(
    client, api, user_factory, organization_factory, login,
):
    owner = user_factory(kind="project", role="moderator")
    first = organization_factory(owner, name="Mesmo nome")
    second = organization_factory(owner, name="Mesmo nome")
    headers = login(owner)
    ticket_ids = [client.post("/api/support", headers=headers, json={
        "subject": "Dúvida de teste", "message": "Descrição fictícia para o suporte.",
    }).json()["id"] for _ in range(2)]
    models = importlib.import_module("app.models")
    instant = datetime(2026, 10, 21, 12, 0, tzinfo=timezone.utc)
    with api.transaction() as db:
        db.execute(update(models.organizations).values(created_at=instant))
        db.execute(update(models.support_tickets).values(created_at=instant))
    for endpoint in ("/api/organizations/mine", "/api/public/projects"):
        response = client.get(endpoint, headers=headers).json()
        assert [item["id"] for item in response] == [second["id"], first["id"]]
        assert datetime.fromisoformat(response[0]["created_at"].replace("Z", "+00:00")) == instant
    assert [item["id"] for item in client.get("/api/projects/open").json()] == [first["id"], second["id"]]
    assert [item["id"] for item in client.get("/api/support/mine", headers=headers).json()] == ticket_ids[::-1]
    assert [item["id"] for item in client.get("/api/moderation/overview", headers=headers).json()["tickets"]] == ticket_ids[::-1]


def test_explicit_seed_is_idempotent_and_preserves_existing_data(api, client):
    seed = importlib.import_module("app.seed")
    models = importlib.import_module("app.models")
    seed.seed_demo_users(environment="test")
    with api.transaction() as db:
        db.execute(update(models.users).where(models.users.c.username == "user1").values(
            full_name="Nome preservado", password_hash=api.hash_password(PASSWORD), role="volunteer"))
        db.execute(update(models.organizations).where(models.organizations.c.institution_kind == "project")
            .values(name="Perfil preservado"))
    def snapshot():
        with api.transaction() as db:
            return {table.name: list(db.execute(select(table).order_by(*table.primary_key.columns)).mappings())
                    for table in models.metadata.sorted_tables}
    before = snapshot()
    seed.seed_demo_users(environment="development")
    assert snapshot() == before
    session = client.post("/api/auth/login", json={"document": "11111111111", "password": PASSWORD})
    assert session.status_code == 200
    assert session.json()["user"]["full_name"] == "Nome preservado"
    assert session.json()["user"]["role"] == "volunteer"
    assert len(before["users"]) == 5
    assert len(before["organizations"]) == 2
    assert len(before["announcements"]) == 3


def test_seed_does_not_rename_legacy_demo_account(api, user_factory):
    seed = importlib.import_module("app.seed")
    old = user_factory(email="user1@impactledger.local", username="old_username")
    with api.transaction() as db:
        before = dict(db.execute(select(api.users).where(api.users.c.id == old["id"])).mappings().one())
    seed.seed_demo_users(environment="test")
    with api.transaction() as db:
        after = dict(db.execute(select(api.users).where(api.users.c.id == old["id"])).mappings().one())
        assert db.scalar(select(func.count()).select_from(api.users).where(api.users.c.username == "user1")) == 0
    assert after == before


def test_seed_requires_explicit_supported_environment(api, monkeypatch, capsys):
    seed = importlib.import_module("app.seed")
    with pytest.raises(ValueError):
        seed.seed_demo_users(environment="production")
    monkeypatch.setattr(sys, "argv", ["seed"])
    with pytest.raises(SystemExit) as error:
        seed.main()
    assert error.value.code == 2
    monkeypatch.setattr(sys, "argv", ["seed", "--environment", "test"])
    seed.main()
    assert "Seed explícito concluído" in capsys.readouterr().out


@pytest.mark.parametrize("domain,is_demo", [
    ("socialtrade.local", True), ("impactledger.local", True),
    ("socialtrade.local.example.org", False), ("impactledger.local.example.org", False),
])
def test_legacy_and_current_demo_domains_are_flagged_in_private_and_public_profiles(
    client, user_factory, organization_factory, login, domain, is_demo,
):
    owner = user_factory(kind="project", email="demo@" + domain)
    organization_factory(owner)
    own = client.get("/api/organizations/mine", headers=login(owner)).json()[0]
    assert own["is_demo"] is is_demo
    public = client.get("/api/public/organizations/" + own["slug"]).json()
    assert public["is_demo"] is is_demo
    assert client.get("/api/public/projects").json()[0]["is_demo"] is is_demo


@pytest.mark.parametrize("document", [
    "12AſC34501DE20", "12.AſC.345/01DE-20",
    "12Aß4501DE313", "12.Aß.450/1DE3-13",
])
def test_unicode_document_letters_are_rejected_before_ascii_uppercase(
    client, institution_data, api, document,
):
    from app.documents import normalize_document, valid_cnpj
    # Both uppercase ASCII counterparts have valid check digits. Rejecting the
    # Unicode originals must therefore happen before upper() changes their text.
    assert valid_cnpj("12ASC34501DE20") == "12ASC34501DE20"
    assert valid_cnpj("12ASS4501DE313") == "12ASS4501DE313"
    with pytest.raises(ValueError):
        normalize_document(document)
    assert client.post("/api/auth/register-institution", json=institution_data(document=document)).status_code == 422
    nested = institution_data()
    nested["organization"]["cnpj"] = document
    assert client.post("/api/auth/register-institution", json=nested).status_code == 422
    assert client.post("/api/auth/login", json={"document": document, "password": PASSWORD}).status_code == 422
    with api.connect() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 0


@pytest.mark.parametrize("field", ["full_name", "phone", "responsible_title"])
def test_person_registration_rejects_nul_without_writing(api, person_data, field):
    from fastapi.testclient import TestClient
    with TestClient(api.app, raise_server_exceptions=False) as client:
        response = client.post("/api/auth/register", json=person_data(**{field: "Texto\x00 inválido"}))
    assert response.status_code == 422
    with api.connect() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 0


@pytest.mark.parametrize("field", ["full_name", "phone"])
def test_institution_registration_rejects_nul_without_partial_account(api, institution_data, field):
    from fastapi.testclient import TestClient
    with TestClient(api.app, raise_server_exceptions=False) as client:
        response = client.post("/api/auth/register-institution", json=institution_data(**{field: "Texto\x00 inválido"}))
    assert response.status_code == 422
    with api.connect() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 0
        assert db.scalar(select(func.count()).select_from(api.organizations)) == 0


@pytest.mark.parametrize("field", [
    "name", "city", "short_description", "objective", "impact_summary", "description",
    "website_url", "instagram_url", "pix_key", "logo_url",
])
def test_organization_writes_reject_nul_and_preserve_existing_profile(
    api, client, user_factory, organization_factory, organization_data, institution_data, login, field,
):
    from fastapi.testclient import TestClient
    owner = user_factory(kind="project")
    organization = organization_factory(owner)
    headers = login(owner)
    before = client.get("/api/organizations/mine", headers=headers).json()
    invalid = ("https://example.org/" if field.endswith("_url") else "Texto válido") + "\x00inválido"
    payload = organization_data(**{field: invalid})
    nested = institution_data()
    nested["organization"][field] = invalid
    with TestClient(api.app, raise_server_exceptions=False) as checked_client:
        assert checked_client.post("/api/auth/register-institution", json=nested).status_code == 422
        assert checked_client.post("/api/organizations", headers=headers, json=payload).status_code == 422
        assert checked_client.patch(f"/api/organizations/{organization['id']}", headers=headers, json=payload).status_code == 422
    assert client.get("/api/organizations/mine", headers=headers).json() == before
    with api.connect() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 1
        assert db.scalar(select(func.count()).select_from(api.organizations)) == 1


@pytest.mark.parametrize("field", ["full_name", "phone", "responsible_title"])
def test_profile_patch_rejects_nul_without_mutating_account(api, client, user_factory, login, field):
    from fastapi.testclient import TestClient
    headers = login(user_factory())
    before = client.get("/api/profile", headers=headers).json()
    payload = {"full_name": "Pessoa fictícia", field: "Texto\x00 inválido"}
    with TestClient(api.app, raise_server_exceptions=False) as checked_client:
        assert checked_client.patch("/api/profile", headers=headers, json=payload).status_code == 422
    assert client.get("/api/profile", headers=headers).json() == before


@pytest.mark.parametrize("endpoint,field,values,table", [
    ("/api/support", "subject", {"subject": "Assunto válido", "message": "Mensagem de exemplo válida"}, "support_tickets"),
    ("/api/support", "message", {"subject": "Assunto válido", "message": "Mensagem de exemplo válida"}, "support_tickets"),
    ("/api/moderation/announcements", "title", {"title": "Aviso válido", "body": "Conteúdo de exemplo válido", "category": "teste"}, "announcements"),
    ("/api/moderation/announcements", "body", {"title": "Aviso válido", "body": "Conteúdo de exemplo válido", "category": "teste"}, "announcements"),
    ("/api/moderation/announcements", "category", {"title": "Aviso válido", "body": "Conteúdo de exemplo válido", "category": "teste"}, "announcements"),
])
def test_support_and_announcement_reject_nul_without_writing(api, user_factory, login, endpoint, field, values, table):
    from fastapi.testclient import TestClient
    headers = login(user_factory(role="moderator"))
    with TestClient(api.app, raise_server_exceptions=False) as client:
        response = client.post(endpoint, headers=headers, json={**values, field: values[field] + "\x00"})
    assert response.status_code == 422
    with api.connect() as db:
        assert db.scalar(select(func.count()).select_from(getattr(api, "announcement_table" if table == "announcements" else table))) == 0


def test_public_slug_rejects_nul_before_query(api):
    from fastapi.testclient import TestClient
    with TestClient(api.app, raise_server_exceptions=False) as client:
        assert client.get("/api/public/organizations/a%00b").status_code == 422


def test_non_nul_text_and_nul_password_still_register_and_authenticate(client, person_data, api):
    password = PASSWORD + "\x00"
    payload = person_data(full_name="Nome\t fictício\ncom acento", phone="telefone\x01fictício",
        responsible_title="Função\x02fictícia", password=password, password_confirmation=password)
    assert client.post("/api/auth/register", json=payload).status_code == 201
    response = client.post("/api/auth/login", json={"document": payload["document"], "password": password})
    assert response.status_code == 200
    assert response.json()["user"]["full_name"] == payload["full_name"]
    assert response.json()["user"]["phone"] == payload["phone"]
    with api.connect() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 1
