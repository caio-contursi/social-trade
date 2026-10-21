"""Credential storage and token integrity contracts."""
import importlib

import pytest
from sqlalchemy import select


def test_registration_stores_salted_password_hash(client, person_data, api):
    payload = person_data()
    assert client.post("/api/auth/register", json=payload).status_code == 201
    with api.transaction() as db:
        stored = db.scalar(select(api.users.c.password_hash))
    assert stored != payload["password"]
    assert payload["password"] not in stored
    assert api.verify_password(payload["password"], stored)
    assert not api.verify_password("a different password", stored)
    second_hash = api.hash_password(payload["password"])
    assert second_hash != stored
    assert api.verify_password(payload["password"], second_hash)


@pytest.mark.parametrize("stored", ["", "broken", "%%$%%"])
def test_malformed_password_hash_does_not_authenticate(api, stored):
    assert api.verify_password("AnyPassword123!", stored) is False


def test_token_signature_binds_the_account_id(api, user_factory, monkeypatch):
    security = importlib.import_module("app.security")
    monkeypatch.setattr(security.time, "time", lambda: 2_000_000_000)
    first, second = user_factory(), user_factory()
    first_token, second_token = api.issue_token(first["id"]), api.issue_token(second["id"])
    first_payload, first_signature = first_token.split(".")
    second_payload, _ = second_token.split(".")
    assert first_payload != second_payload
    assert security.read_token(second_payload + "." + first_signature) is None
    assert security.read_token(first_token) == first["id"]


@pytest.mark.parametrize("token", ["", "invalid", ".", "a.b.c", "a.é"])
def test_malformed_tokens_never_authenticate(api, token):
    assert importlib.import_module("app.security").read_token(token) is None
