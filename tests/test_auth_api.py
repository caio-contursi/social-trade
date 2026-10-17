"""Authentication, account registration, rollback, and membership permissions."""
import importlib
import re

import pytest

PASSWORD = "LocalTestPassword123!"


def count_rows(api, table):
    with api.transaction() as db:
        return db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def test_register_person_then_login_with_formatted_cpf(client, person_data):
    payload = person_data(username="NOVA_PESSOA", email="Pessoa@EXAMPLE.ORG")
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201, response.text
    registration = response.json()["registration_number"]
    assert re.fullmatch(r"\d{6}", registration)
    session = client.post("/api/auth/login", json={
        "document": "529.982.247-25", "password": PASSWORD, "account_type": "project",
    })
    assert session.status_code == 200
    assert session.json()["token_type"] == "bearer"
    user = session.json()["user"]
    assert user["username"] == "nova_pessoa"
    assert user["email"] == "pessoa@example.org"
    assert user["registration_number"] == registration
    assert user["account_type"] == "person"
    assert user["role"] == "member"
    headers = {"Authorization": "Bearer " + session.json()["access_token"]}
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["id"] == user["id"]
    assert not {"password", "password_hash", "token_secret"}.intersection(me.json())
    assert client.get("/api/organizations/mine", headers=headers).json() == []


@pytest.mark.parametrize("change", [
    {"password": "short", "password_confirmation": "short"},
    {"password_confirmation": "A different password!"},
    {"document": "11111111111"},
    {"document": "52998224724"},
    {"email": "invalid-email"},
    {"username": "bad username"},
    {"username": "ab"},
    {"full_name": "  "},
    {"responsible_title": "   "},
    {"role": "moderator"},
    {"member_role": "owner"},
])
def test_invalid_person_registration_writes_nothing(client, person_data, api, change):
    response = client.post("/api/auth/register", json=person_data(**change))
    assert response.status_code == 422, response.text
    assert count_rows(api, "users") == 0
    assert count_rows(api, "project_memberships") == 0


@pytest.mark.parametrize("collision", ["email", "username", "document"])
def test_duplicate_person_registration_returns_conflict_without_partial_write(
    client, person_data, api, collision,
):
    first = person_data()
    assert client.post("/api/auth/register", json=first).status_code == 201
    second = person_data(
        username="outra_pessoa", email="outra@example.org", document="11144477735",
    )
    second[collision] = first[collision].upper() if collision != "document" else first[collision]
    response = client.post("/api/auth/register", json=second)
    assert response.status_code == 409, response.text
    assert count_rows(api, "users") == 1


@pytest.mark.parametrize("kind", ["project", "donor"])
def test_register_institution_creates_owner_and_matching_organization(
    client, institution_data, kind, api,
):
    response = client.post("/api/auth/register-institution", json=institution_data(kind))
    assert response.status_code == 201, response.text
    assert count_rows(api, "users") == count_rows(api, "organizations") == 1
    session = client.post("/api/auth/login", json={
        "document": "11.222.333/0001-81", "password": PASSWORD, "account_type": kind,
    })
    assert session.status_code == 200
    headers = {"Authorization": "Bearer " + session.json()["access_token"]}
    owned = client.get("/api/organizations/mine", headers=headers).json()
    assert len(owned) == 1
    assert owned[0]["institution_kind"] == kind
    assert owned[0]["cnpj"] == "11222333000181"
    assert session.json()["user"]["account_type"] == kind
    assert len(client.get("/api/public/projects").json()) == (1 if kind == "project" else 0)


@pytest.mark.parametrize("field,value", [
    ("document", "11111111111111"),
    ("document", "11222333000180"),
    ("document", "00000000000000"),
])
def test_institution_registration_requires_valid_cnpj(client, institution_data, api, field, value):
    response = client.post("/api/auth/register-institution", json=institution_data(**{field: value}))
    assert response.status_code == 422, response.text
    assert count_rows(api, "users") == count_rows(api, "organizations") == 0


@pytest.mark.parametrize("collision", ["email", "document"])
def test_duplicate_institution_registration_is_atomic(client, institution_data, api, collision):
    first = institution_data()
    assert client.post("/api/auth/register-institution", json=first).status_code == 201
    second = institution_data(document="11444777000161", email="outra@example.org")
    second[collision] = first[collision].upper() if collision == "email" else first[collision]
    response = client.post("/api/auth/register-institution", json=second)
    assert response.status_code == 409
    assert count_rows(api, "users") == count_rows(api, "organizations") == 1


@pytest.mark.parametrize("organization_change", [
    {"objective": None}, {"impact_summary": "  "},
    {"areas": ["unknown-area"]}, {"interested_services": ["unknown-service"]},
])
def test_institution_registration_rolls_back_owner_when_organization_is_invalid(
    client, institution_data, api, organization_change,
):
    payload = institution_data()
    payload["organization"].update(organization_change)
    response = client.post("/api/auth/register-institution", json=payload)
    assert response.status_code == 422, response.text
    assert count_rows(api, "users") == 0
    assert count_rows(api, "organizations") == 0
    assert count_rows(api, "organization_areas") == 0
    assert count_rows(api, "organization_services") == 0


@pytest.mark.parametrize("role", ["staff", "assisted"])
def test_membership_is_visible_only_to_member_and_does_not_grant_editing(
    client, person_data, user_factory, organization_factory, login, role,
):
    owner = user_factory(kind="project")
    outsider = user_factory()
    project = organization_factory(owner)
    response = client.post("/api/auth/register", json=person_data(
        member_project_id=project["id"], member_role=role,
    ))
    assert response.status_code == 201, response.text
    member = {"document": "52998224725", "kind": "person"}
    headers = login(member)
    memberships = client.get("/api/memberships/mine", headers=headers)
    assert memberships.status_code == 200
    assert [(item["id"], item["member_role"]) for item in memberships.json()] == [(project["id"], role)]
    assert client.get("/api/memberships/mine", headers=login(outsider)).json() == []
    assert client.get("/api/memberships/mine", headers=login(owner)).json() == []
    payload = {key: value for key, value in project.items() if key != "id"}
    assert client.patch(f"/api/organizations/{project['id']}", headers=headers, json=payload).status_code == 403
    assert client.get("/api/organizations/mine", headers=headers).json() == []


@pytest.mark.parametrize("case", ["missing", "no_role", "donor"])
def test_invalid_membership_rolls_back_new_user(
    client, person_data, user_factory, organization_factory, api, case,
):
    owner = user_factory(kind="donor" if case == "donor" else "project")
    org = organization_factory(owner)
    response = client.post("/api/auth/register", json=person_data(
        member_project_id=999999 if case == "missing" else org["id"],
        member_role=None if case == "no_role" else "staff",
    ))
    assert response.status_code == 422, response.text
    assert count_rows(api, "users") == 1
    assert count_rows(api, "project_memberships") == 0


@pytest.mark.parametrize("authorization", [
    None, "Basic abc", "Bearer invalid", "Bearer abc.def", "Bearer .",
])
@pytest.mark.parametrize("endpoint", [
    "/api/auth/me", "/api/profile", "/api/organizations/mine",
    "/api/memberships/mine", "/api/announcements", "/api/support/mine",
])
def test_private_reads_require_valid_bearer_token(client, endpoint, authorization):
    headers = {"Authorization": authorization} if authorization else {}
    assert client.get(endpoint, headers=headers).status_code == 401


def test_expired_and_tampered_tokens_are_rejected(client, user_factory, api, monkeypatch):
    user = user_factory()
    security = importlib.import_module("app.security")
    moment = 2_000_000_000
    monkeypatch.setattr(security.time, "time", lambda: moment)
    token = api.issue_token(user["id"])
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + token}).status_code == 200
    payload, signature = token.split(".")
    corrupted = payload + "." + ("A" if signature[0] != "A" else "B") + signature[1:]
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + corrupted}).status_code == 401
    moment += security.TOKEN_TTL_SECONDS + 1
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + token}).status_code == 401


def test_token_for_deleted_account_cannot_be_reused(client, user_factory, login, api):
    user = user_factory()
    headers = login(user)
    with api.transaction() as db:
        db.execute("DELETE FROM users WHERE id=?", (user["id"],))
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_profile_update_isolated_from_other_account_and_cannot_escalate_role(
    client, user_factory, login,
):
    first, other = user_factory(), user_factory()
    first_headers, other_headers = login(first), login(other)
    before = client.get("/api/profile", headers=other_headers).json()
    response = client.patch("/api/profile", headers=first_headers, json={
        "full_name": "Nome atualizado", "phone": "11999999999",
        "responsible_title": "Coordenadora", "role": "moderator", "id": other["id"],
    })
    assert response.status_code == 200
    own = client.get("/api/profile", headers=first_headers).json()
    assert own["full_name"] == "Nome atualizado"
    assert own["role"] == "member"
    assert own["id"] == first["id"]
    assert client.get("/api/profile", headers=other_headers).json() == before


def test_profile_rejects_whitespace_name(client, user_factory, login):
    headers = login(user_factory())
    before = client.get("/api/profile", headers=headers).json()
    response = client.patch("/api/profile", headers=headers, json={"full_name": "   "})
    assert response.status_code == 422
    assert client.get("/api/profile", headers=headers).json() == before


@pytest.mark.parametrize("kind", ["donor", "person"])
def test_only_project_accounts_can_create_organizations(
    client, user_factory, login, organization_data, api, kind,
):
    response = client.post("/api/organizations", headers=login(user_factory(kind=kind)), json=organization_data())
    assert response.status_code == 403
    assert count_rows(api, "organizations") == 0


def test_project_creation_assigns_current_owner_and_unique_slug(
    client, user_factory, login, organization_data,
):
    first = user_factory(kind="project")
    second = user_factory(kind="project")
    created = []
    for user in (first, second):
        response = client.post("/api/organizations", headers=login(user), json=organization_data(name="Ação Social"))
        assert response.status_code == 201, response.text
        assert response.json()["owner_id"] == user["id"]
        created.append(response.json())
    assert created[0]["slug"] == "acao-social"
    assert created[1]["slug"] == "acao-social-2"
    assert [item["id"] for item in client.get("/api/organizations/mine", headers=login(first)).json()] == [created[0]["id"]]
    assert [item["id"] for item in client.get("/api/organizations/mine", headers=login(second)).json()] == [created[1]["id"]]


@pytest.mark.parametrize("field,value", [
    ("full_name", None), ("full_name", 123),
    ("responsible_title", None), ("responsible_title", 123),
])
def test_person_registration_rejects_non_text_fields_without_creating_account(client, person_data, api, field, value):
    response = client.post("/api/auth/register", json=person_data(**{field: value}))
    assert response.status_code == 422
    assert count_rows(api, "users") == 0
