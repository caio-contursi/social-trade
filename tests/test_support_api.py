"""Support, moderation, announcements, and public/private boundaries."""
import pytest
from unittest.mock import patch
from sqlalchemy import select, func
from sqlalchemy.exc import SQLAlchemyError


def test_anonymous_health_and_catalog_expose_no_accounts(client):
    for endpoint in ("/health", "/api/health"):
        health = client.get(endpoint)
        assert health.status_code == 200
        assert health.json() == {
            "status": "ok", "database": "ok", "blockchain": "disabled",
        }
    catalog = client.get("/api/catalog")
    assert catalog.status_code == 200
    assert catalog.json()["demo_users_enabled"] is False
    assert not {"users", "secret", "token_secret", "database_path"}.intersection(catalog.json())


def test_api_port_does_not_serve_the_legacy_web_interface(client):
    root = client.get("/")
    assert root.status_code == 200
    assert root.json() == {
        "service": "SocialTrade API",
        "message": "A interface web é servida pelo frontend Next.js.",
    }

    legacy_page = client.get("/public")
    assert legacy_page.status_code == 410
    assert legacy_page.json() == {
        "detail": "Esta interface foi descontinuada. Use a interface principal da SocialTrade.",
    }

    assert client.get("/api/health").status_code == 200


def test_health_reports_database_outage_without_exposing_driver_details(client, monkeypatch):
    class BrokenConnection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, _statement):
            raise SQLAlchemyError("private database connection details")

    monkeypatch.setattr("app.main.connect", lambda: BrokenConnection())
    response = client.get("/api/health")
    assert response.status_code == 503
    assert response.json() == {"detail": "Banco de dados indisponível."}
    assert "private database" not in response.text


def test_demo_users_disabled_before_first_import(client, api):
    with api.transaction() as db:
        assert db.scalar(select(func.count()).select_from(api.users)) == 0
    assert client.post("/api/auth/login", json={
        "document": "11111111111", "password": "SocialTrade123!", "account_type": "project",
    }).status_code == 401


@pytest.mark.parametrize("method,endpoint,payload", [
    ("post", "/api/organizations", {"name": "Incompleto"}),
    ("patch", "/api/profile", {"full_name": "Nome atualizado"}),
    ("post", "/api/support", {"subject": "Preciso de ajuda", "message": "Minha solicitação completa."}),
    ("get", "/api/moderation/overview", None),
    ("patch", "/api/moderation/tickets/1", {"status": "resolved"}),
    ("post", "/api/moderation/announcements", {"title": "Novo aviso", "body": "Uma informação importante."}),
])
def test_anonymous_mutations_and_moderation_require_authentication(client, method, endpoint, payload):
    kwargs = {"json": payload} if payload is not None else {}
    assert client.request(method, endpoint, **kwargs).status_code == 401


def test_support_tickets_are_visible_only_to_their_creator(client, user_factory, login):
    first, second = user_factory(), user_factory()
    headers = login(first)
    response = client.post("/api/support", headers=headers, json={
        "subject": "  Atualização de cadastro  ", "message": "  Preciso atualizar meus dados cadastrais.  ",
    })
    assert response.status_code == 201
    tickets = client.get("/api/support/mine", headers=headers)
    assert tickets.status_code == 200
    assert len(tickets.json()) == 1
    ticket = tickets.json()[0]
    assert ticket["id"] == response.json()["id"]
    assert ticket["subject"] == "Atualização de cadastro"
    assert ticket["message"] == "Preciso atualizar meus dados cadastrais."
    assert ticket["status"] == "open"
    assert set(ticket) == {"id", "protocol", "subject", "message", "status", "created_at"}
    assert client.get("/api/support/mine", headers=login(second)).json() == []


def test_ticket_protocol_retries_collision_preserves_zeroes_and_never_changes_with_status(client, user_factory, login):
    headers = login(user_factory())
    moderator_headers = login(user_factory(role="moderator"))
    payload = {"subject": "Protocolo de teste", "message": "Relato fictício para validar o protocolo."}
    with patch("app.main.secrets.randbelow", side_effect=[7, 7, 42]):
        first = client.post("/api/support", headers=headers, json=payload)
        second = client.post("/api/support", headers=headers, json=payload)
    assert first.status_code == second.status_code == 201
    assert first.json()["protocol"] == "000007"
    assert second.json()["protocol"] == "000042"
    tickets = client.get("/api/support/mine", headers=headers).json()
    assert {ticket["protocol"] for ticket in tickets} == {"000007", "000042"}
    for state in ["in_progress", "resolved"]:
        response = client.patch(f"/api/moderation/tickets/{first.json()['id']}", headers=moderator_headers, json={"status": state})
        assert response.status_code == 200
        persisted = next(ticket for ticket in client.get("/api/support/mine", headers=headers).json() if ticket["id"] == first.json()["id"])
        assert persisted["protocol"] == "000007"
        assert persisted["status"] == state
    overview = client.get("/api/moderation/overview", headers=moderator_headers).json()
    assert next(ticket for ticket in overview["tickets"] if ticket["id"] == first.json()["id"])["protocol"] == "000007"


def test_ticket_protocol_collision_limit_never_creates_duplicate_or_incomplete_ticket(client, user_factory, login):
    headers = login(user_factory())
    payload = {"subject": "Protocolo de teste", "message": "Relato fictício para validar a colisão."}
    with patch("app.main.secrets.randbelow", return_value=0):
        assert client.post("/api/support", headers=headers, json=payload).json()["protocol"] == "000000"
        failed = client.post("/api/support", headers=headers, json=payload)
    assert failed.status_code == 503
    listing = client.get("/api/support/mine", headers=headers).json()
    assert len(listing) == 1
    assert listing[0]["protocol"] == "000000"


def test_concurrent_tickets_receive_distinct_six_digit_protocols(client, user_factory, login):
    from concurrent.futures import ThreadPoolExecutor
    import re
    headers = login(user_factory())
    def submit(index):
        return client.post("/api/support", headers=headers, json={"subject": f"Solicitação {index}", "message": "Mensagem sintética de teste concorrente."})
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(pool.map(submit, range(8)))
    assert all(response.status_code == 201 for response in responses)
    codes = [response.json()["protocol"] for response in responses]
    assert len(set(codes)) == 8
    assert all(re.fullmatch(r"[0-9]{6}", code) for code in codes)
    assert len(client.get("/api/support/mine", headers=headers).json()) == 8


@pytest.mark.parametrize("payload", [
    {"subject": "abc", "message": "Uma descrição válida."},
    {"subject": "Assunto válido", "message": "curto"},
    {"subject": "    ", "message": "Uma descrição válida."},
    {"subject": "Assunto válido", "message": "          "},
    {"subject": "x" * 141, "message": "Uma descrição válida."},
    {"subject": "Assunto válido", "message": "x" * 4001},
])
def test_invalid_support_requests_do_not_create_tickets(client, user_factory, login, payload):
    headers = login(user_factory())
    response = client.post("/api/support", headers=headers, json=payload)
    assert response.status_code == 422, response.text
    assert client.get("/api/support/mine", headers=headers).json() == []


@pytest.mark.parametrize("role", ["member", "volunteer"])
@pytest.mark.parametrize("method,endpoint,payload", [
    ("get", "/api/moderation/overview", None),
    ("patch", "/api/moderation/tickets/999", {"status": "resolved"}),
    ("post", "/api/moderation/announcements", {"title": "Aviso indevido", "body": "Esta publicação não pode existir."}),
])
def test_non_moderators_cannot_read_or_mutate_moderation(
    client, user_factory, login, role, method, endpoint, payload,
):
    headers = login(user_factory(role=role))
    before = client.get("/api/announcements", headers=headers).json()
    kwargs = {"json": payload} if payload else {}
    assert client.request(method, endpoint, headers=headers, **kwargs).status_code == 403
    assert client.get("/api/announcements", headers=headers).json() == before


def test_moderator_can_manage_ticket_and_publish_announcement(client, user_factory, login):
    member = user_factory()
    moderator = user_factory(role="moderator")
    member_headers, moderator_headers = login(member), login(moderator)
    ticket = client.post("/api/support", headers=member_headers, json={
        "subject": "Dúvida de acesso", "message": "Tenho uma dúvida sobre os dados da minha conta.",
    }).json()
    overview = client.get("/api/moderation/overview", headers=moderator_headers)
    assert overview.status_code == 200
    assert overview.json()["counts"] == {"users": 2, "organizations": 0, "open_tickets": 1}
    assert overview.json()["tickets"][0]["email"] == member["email"]
    assert overview.json()["tickets"][0]["id"] == ticket["id"]
    for status in ("in_progress", "resolved"):
        updated = client.patch(
            f"/api/moderation/tickets/{ticket['id']}", headers=moderator_headers,
            json={"status": status},
        )
        assert updated.status_code == 200
        assert client.get("/api/support/mine", headers=member_headers).json()[0]["status"] == status
    assert client.get("/api/moderation/overview", headers=moderator_headers).json()["counts"]["open_tickets"] == 0
    published = client.post("/api/moderation/announcements", headers=moderator_headers, json={
        "title": "  Manutenção programada  ",
        "body": "  O atendimento ficará disponível após a manutenção.  ", "category": "plataforma",
    })
    assert published.status_code == 201
    listing = client.get("/api/announcements", headers=member_headers)
    assert listing.status_code == 200
    entry = next(item for item in listing.json() if item["id"] == published.json()["id"])
    assert entry["title"] == "Manutenção programada"
    assert entry["body"] == "O atendimento ficará disponível após a manutenção."


def test_moderation_ticket_rejects_unknown_status_and_missing_id(client, user_factory, login):
    headers = login(user_factory(role="moderator"))
    assert client.patch("/api/moderation/tickets/999", headers=headers, json={"status": "resolved"}).status_code == 404
    assert client.patch("/api/moderation/tickets/999", headers=headers, json={"status": "deleted"}).status_code == 422


@pytest.mark.parametrize("payload", [
    {"title": "abc", "body": "Uma mensagem suficientemente longa."},
    {"title": "Aviso completo", "body": "curto"},
    {"title": "    ", "body": "Uma mensagem suficientemente longa."},
    {"title": "Aviso completo", "body": "          "},
])
def test_invalid_announcements_are_not_published(client, user_factory, login, payload):
    headers = login(user_factory(role="moderator"))
    before = client.get("/api/announcements", headers=headers).json()
    response = client.post("/api/moderation/announcements", headers=headers, json=payload)
    assert response.status_code == 422
    assert client.get("/api/announcements", headers=headers).json() == before


def test_public_project_selector_exposes_only_minimal_fields(
    client, user_factory, organization_factory,
):
    owner = user_factory(kind="project")
    donor = user_factory(kind="donor")
    project = organization_factory(owner, pix_key="private-pix-value", cnpj="11222333000181")
    organization_factory(donor)
    response = client.get("/api/projects/open")
    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [project["id"]]
    assert set(response.json()[0]) == {"id", "name", "city", "state"}
    assert "private-pix-value" not in response.text
    assert owner["email"] not in response.text


def test_empty_public_discovery_and_missing_profile(client):
    assert client.get("/api/public/projects").json() == []
    assert client.get("/api/projects/open").json() == []
    assert client.get("/api/public/organizations/not-found").status_code == 404
