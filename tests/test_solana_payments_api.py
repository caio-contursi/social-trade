from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest


def create_payment(client, headers, project_id, **overrides):
    payload = {
        "amount_lamports": 50_000_000,
        "target": "project",
        "project_id": project_id,
        "cause_code": "education",
    }
    payload.update(overrides)
    return client.post("/api/solana-payments/intents", headers=headers, json=payload)


def test_payment_intent_is_unique_private_and_confirms_only_after_rpc_match(
    client, user_factory, organization_factory, login,
):
    donor = user_factory(kind="person", email="sol-donor@example.test")
    other_donor = user_factory(kind="person", email="other-sol-donor@example.test")
    project_owner = user_factory(kind="project", email="sol-project@example.test")
    project = organization_factory(project_owner)
    donor_headers = login(donor)

    with patch("app.main.new_payment_reference", return_value="11111111111111111111111111111111"), \
            patch("app.main.find_confirmed_payment", return_value=None) as find_payment:
        created = create_payment(client, donor_headers, project["id"])
        assert created.status_code == 201, created.text
        intent = created.json()
        assert intent["status"] == "pending"
        assert intent["amount_lamports"] == 50_000_000
        assert intent["recipient_address"] == "4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry"
        assert "amount=0.05&reference=11111111111111111111111111111111" in intent["payment_uri"]

        pending = client.post(f"/api/solana-payments/intents/{intent['id']}/verify", headers=donor_headers)
        assert pending.status_code == 200
        assert pending.json()["status"] == "pending"
        find_payment.assert_called_once()

        unauthorized = client.post(
            f"/api/solana-payments/intents/{intent['id']}/verify",
            headers=login(other_donor),
        )
        assert unauthorized.status_code == 404

        find_payment.return_value = "5yM4signaturedeTeste"
        confirmed = client.post(f"/api/solana-payments/intents/{intent['id']}/verify", headers=donor_headers)
        assert confirmed.status_code == 200
        assert confirmed.json()["status"] == "confirmed"
        assert confirmed.json()["transaction_signature"] == "5yM4signaturedeTeste"

        already_confirmed = client.post(f"/api/solana-payments/intents/{intent['id']}/verify", headers=donor_headers)
        assert already_confirmed.json()["status"] == "confirmed"
        assert find_payment.call_count == 2


def test_solana_intents_enforce_donor_role_and_target_validity(client, user_factory, organization_factory, login):
    project_owner = user_factory(kind="project", email="target-owner@example.test")
    project = organization_factory(project_owner)
    donor = user_factory(kind="person", email="target-donor@example.test")
    project_headers = login(project_owner)
    donor_headers = login(donor)

    denied = create_payment(client, project_headers, project["id"])
    assert denied.status_code == 403

    missing_project = client.post("/api/solana-payments/intents", headers=donor_headers, json={
        "amount_lamports": 50_000_000, "target": "project",
    })
    assert missing_project.status_code == 422

    other_kind = client.post("/api/solana-payments/intents", headers=donor_headers, json={
        "amount_lamports": 50_000_000, "target": "socialtrade", "project_id": project["id"],
    })
    assert other_kind.status_code == 422

    invalid_amount = client.post("/api/solana-payments/intents", headers=donor_headers, json={
        "amount_lamports": 1, "target": "socialtrade",
    })
    assert invalid_amount.status_code == 422

    bad_project = create_payment(client, donor_headers, 999999)
    assert bad_project.status_code == 404


def test_rpc_failure_never_marks_payment_confirmed(client, user_factory, organization_factory, login):
    from app.solana import SolanaRpcError

    donor = user_factory(kind="person", email="rpc-donor@example.test")
    owner = user_factory(kind="project", email="rpc-project@example.test")
    project = organization_factory(owner)
    headers = login(donor)
    with patch("app.main.find_confirmed_payment", side_effect=[SolanaRpcError("RPC indisponível"), None]):
        intent = create_payment(client, headers, project["id"]).json()
        response = client.post(f"/api/solana-payments/intents/{intent['id']}/verify", headers=headers)
        still_pending = client.post(f"/api/solana-payments/intents/{intent['id']}/verify", headers=headers)
    assert response.status_code == 503
    assert still_pending.status_code == 200
    assert still_pending.json()["status"] == "pending"


def test_payment_intent_has_no_expiration_and_remains_pending_after_many_days(client, user_factory, organization_factory, login, api):
    from app.models import solana_payment_intents
    from sqlalchemy import update
    donor = user_factory(kind="person", email="no-expiry@example.test")
    owner = user_factory(kind="project", email="no-expiry-project@example.test")
    project = organization_factory(owner)
    headers = login(donor)
    intent = create_payment(client, headers, project["id"]).json()
    assert intent["expires_at"] is None
    with api.transaction() as db:
        db.execute(update(solana_payment_intents).where(solana_payment_intents.c.id == intent["id"]).values(created_at=datetime.now(timezone.utc) - timedelta(days=30)))
    with patch("app.main.find_confirmed_payment", return_value=None):
        response = client.post(f"/api/solana-payments/intents/{intent['id']}/verify", headers=headers)
    assert response.json()["status"] == "pending"
    assert response.json()["expires_at"] is None


def test_payment_verifier_requires_reference_recipient_amount_and_confirmed_blocktime(monkeypatch):
    from app import solana

    signature_rows = [{"signature": "sig-ok", "err": None, "confirmationStatus": "confirmed"}]
    transaction = {
        "blockTime": int((datetime.now(timezone.utc) + timedelta(seconds=10)).timestamp()),
        "meta": {"err": None},
        "transaction": {"message": {
            "accountKeys": [{"pubkey": "unique-reference"}, {"pubkey": "donor"}, {"pubkey": "recipient"}],
            "instructions": [{"program": "system", "parsed": {"type": "transfer", "info": {
                "destination": "recipient", "lamports": 50_000_000,
            }}}],
        }},
    }
    calls = []

    def fake_rpc(method, params):
        calls.append(method)
        return signature_rows if method == "getSignaturesForAddress" else transaction

    monkeypatch.setattr(solana, "_rpc", fake_rpc)
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    assert solana.find_confirmed_payment("unique-reference", "recipient", 50_000_000) == "sig-ok"
    assert calls == ["getSignaturesForAddress", "getTransaction"]

    transaction["transaction"]["message"]["instructions"][0]["parsed"]["info"]["lamports"] = 50_000_001
    assert solana.find_confirmed_payment("unique-reference", "recipient", 50_000_000) is None


    transaction["transaction"]["message"]["instructions"][0]["parsed"]["info"].update(
        destination="attacker", lamports=50_000_000,
    )
    assert solana.find_confirmed_payment("unique-reference", "recipient", 50_000_000) is None

    transaction["transaction"]["message"]["instructions"][0]["parsed"]["info"]["destination"] = "recipient"
    transaction["transaction"]["message"]["accountKeys"] = [{"pubkey": "another-reference"}]
    assert solana.find_confirmed_payment("unique-reference", "recipient", 50_000_000) is None

    transaction["transaction"]["message"]["accountKeys"] = [{"pubkey": "unique-reference"}]
    transaction["blockTime"] = int((expiry + timedelta(minutes=1)).timestamp())
    assert solana.find_confirmed_payment("unique-reference", "recipient", 50_000_000) == "sig-ok"



@pytest.mark.parametrize("lamports,expected", [(1_000_000_000, "1"), (10_000_000_000, "10"), (100_000_000_000, "100"), (100_000, "0.0001"), (1_000_000_001, "1.000000001")])
def test_qr_preserves_integer_zeroes_and_exact_lamports(lamports, expected):
    from urllib.parse import urlparse, parse_qs
    from app.solana import payment_intent_view
    row = dict(id=1, target="socialtrade", project_organization_id=None, cause_code=None,
               amount_lamports=lamports, reference="ref", status="pending", transaction_signature=None,
               expires_at=datetime.now(timezone.utc))
    uri = payment_intent_view(row)["payment_uri"]
    assert parse_qs(urlparse(uri).query)["amount"] == [expected]


def test_cancel_is_private_persistent_idempotent_and_preserves_confirmed_payment(client, user_factory, organization_factory, login):
    donor = user_factory(kind="person", email="cancel@example.test")
    other = user_factory(kind="person", email="cancel-other@example.test")
    owner = user_factory(kind="project", email="cancel-project@example.test")
    project = organization_factory(owner)
    headers = login(donor)
    intent = create_payment(client, headers, project["id"]).json()
    path = f"/api/solana-payments/intents/{intent['id']}"
    assert client.post(path + "/cancel").status_code == 401
    assert client.post(path + "/cancel", headers=login(other)).status_code == 404
    assert client.post(path + "/cancel", headers=login(owner)).status_code == 403
    assert client.post(path + "/cancel", headers=headers).json()["status"] == "cancelled"
    assert client.post(path + "/cancel", headers=headers).json()["status"] == "cancelled"
    with patch("app.main.find_confirmed_payment") as rpc:
        assert client.post(path + "/verify", headers=headers).json()["status"] == "cancelled"
        rpc.assert_not_called()
    new_intent = create_payment(client, headers, project["id"]).json()
    assert new_intent["reference"] != intent["reference"]
    with patch("app.main.find_confirmed_payment", return_value="confirmed-signature"):
        assert client.post(f"/api/solana-payments/intents/{new_intent['id']}/verify", headers=headers).json()["status"] == "confirmed"
    assert client.post(f"/api/solana-payments/intents/{new_intent['id']}/cancel", headers=headers).status_code == 409


@pytest.mark.parametrize("rpc_signature", [None, "signature-during-cancellation"])
def test_inflight_verification_cannot_reopen_cancelled_intent(client, user_factory, organization_factory, login, rpc_signature):
    donor = user_factory(kind="person", email="cancel-race@example.test")
    owner = user_factory(kind="project", email="cancel-race-project@example.test")
    project = organization_factory(owner)
    headers = login(donor)
    intent = create_payment(client, headers, project["id"]).json()
    path = f"/api/solana-payments/intents/{intent['id']}"
    def cancel_during_lookup(*args):
        assert client.post(path + "/cancel", headers=headers).status_code == 200
        return rpc_signature
    with patch("app.main.find_confirmed_payment", side_effect=cancel_during_lookup):
        response = client.post(path + "/verify", headers=headers)
    assert response.json()["status"] == "cancelled"
    assert response.json()["transaction_signature"] is None

