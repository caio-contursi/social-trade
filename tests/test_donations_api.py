"""Pix donation records never receive or move money through SocialTrade."""

import pytest


def setup_donation_accounts(client, user_factory, organization_factory, login, *, approve_pix=True):
    donor = user_factory(kind="donor", email="doadora@example.test")
    beneficiary = user_factory(kind="project", email="projeto@example.test")
    other_project = user_factory(kind="project", email="outro-projeto@example.test")
    person = user_factory(kind="person", email="pessoa@example.test")
    moderator = user_factory(kind="person", role="moderator", email="moderador@example.test")
    project_org = organization_factory(beneficiary, pix_key="projeto-pix@example.test")
    organization_factory(other_project, name="Outro projeto", pix_key="outro-pix@example.test")
    organization_factory(donor, kind="donor", name="Empresa doadora", organization_type="company")
    accounts = {
        "donor": donor, "beneficiary": beneficiary, "other_project": other_project,
        "person": person, "project": project_org,
        "donor_headers": login(donor), "beneficiary_headers": login(beneficiary),
        "other_project_headers": login(other_project), "person_headers": login(person),
        "moderator_headers": login(moderator),
    }
    if approve_pix:
        for project in (project_org,):
            approval = client.patch(
                f"/api/moderation/projects/{project['id']}/pix-verification",
                headers=accounts["moderator_headers"], json={"verified": True},
            )
            assert approval.status_code == 200, approval.text
    return accounts


def test_pix_donation_requires_authorized_donor_and_project_with_direct_pix_key(
    client, user_factory, organization_factory, login,
):
    accounts = setup_donation_accounts(client, user_factory, organization_factory, login, approve_pix=False)
    endpoint = "/api/donations"
    payload = {"project_id": accounts["project"]["id"], "amount_cents": 12500}

    assert client.post(endpoint, json=payload).status_code == 401
    assert client.post(endpoint, headers=accounts["person_headers"], json=payload).status_code == 409
    assert client.post(endpoint, headers=accounts["beneficiary_headers"], json=payload).status_code == 403
    assert client.post(endpoint, headers=accounts["donor_headers"], json={**payload, "amount_cents": 0}).status_code == 422
    assert client.post(endpoint, headers=accounts["donor_headers"], json={**payload, "project_id": 999999}).status_code == 404
    assert client.post(endpoint, headers=accounts["donor_headers"], json=payload).status_code == 409
    assert client.patch(f"/api/moderation/projects/{accounts['project']['id']}/pix-verification",
        headers=accounts["person_headers"], json={"verified": True}).status_code == 403
    approved = client.patch(f"/api/moderation/projects/{accounts['project']['id']}/pix-verification",
        headers=accounts["moderator_headers"], json={"verified": True})
    assert approved.status_code == 200

    no_pix_project = organization_factory(accounts["beneficiary"], name="Projeto sem chave Pix", pix_key=None)
    response = client.post(endpoint, headers=accounts["donor_headers"], json={
        "project_id": no_pix_project["id"], "amount_cents": 1,
    })
    assert response.status_code == 409
    assert "chave Pix" in response.json()["detail"]

    created = client.post(endpoint, headers=accounts["donor_headers"], json=payload)
    assert created.status_code == 201, created.text
    record = created.json()
    assert record["pix_key"] == "projeto-pix@example.test"
    assert record["amount_cents"] == 12500
    assert record["status"] == "awaiting_payment"
    assert "não recebe nem repassa" in record["payment_instructions"]
    assert record["next_step"].startswith("Após pagar")
    assert "não garante abatimento no Imposto de Renda" in record["tax_notice"]
    assert "orientações oficiais do governo" in record["tax_notice"]
    assert "receipt_code" not in record
    public = client.get("/api/public/projects").json()
    public_project = next(item for item in public if item["id"] == accounts["project"]["id"])
    assert public_project["pix_donations_available"] is True
    assert "pix_key" not in public_project


def test_receipt_exists_only_after_beneficiary_confirmation_and_is_private(
    client, user_factory, organization_factory, login,
):
    accounts = setup_donation_accounts(client, user_factory, organization_factory, login)
    created = client.post("/api/donations", headers=accounts["donor_headers"], json={
        "project_id": accounts["project"]["id"], "amount_cents": 47550,
    }).json()
    donation_id = created["id"]
    receipt_url = f"/api/donations/{donation_id}/receipt"

    assert client.get(receipt_url, headers=accounts["donor_headers"]).status_code == 404
    assert client.post(f"/api/donations/{donation_id}/confirm", headers=accounts["donor_headers"]).status_code == 403
    assert client.post(f"/api/donations/{donation_id}/confirm", headers=accounts["other_project_headers"]).status_code == 404
    assert client.post(f"/api/donations/{donation_id}/confirm", headers=accounts["beneficiary_headers"]).status_code == 409

    reported = client.post(f"/api/donations/{donation_id}/report-payment", headers=accounts["donor_headers"], json={
        "end_to_end_id": "E1234567890ABCDE1234567890ABCDE1",
    })
    assert reported.status_code == 200, reported.text
    assert reported.json()["status"] == "awaiting_confirmation"
    assert client.get(receipt_url, headers=accounts["donor_headers"]).status_code == 404

    assert client.post(f"/api/donations/{donation_id}/confirm", headers=accounts["beneficiary_headers"]).status_code == 200
    assert client.post(f"/api/donations/{donation_id}/confirm", headers=accounts["beneficiary_headers"]).status_code == 409

    receipt = client.get(receipt_url, headers=accounts["donor_headers"])
    assert receipt.status_code == 200
    assert receipt.headers["content-type"].startswith("text/html")
    assert "R$ 475,50" in receipt.text
    assert "Empresa doadora" in receipt.text
    assert "projeto-pix@example.test" not in receipt.text
    assert "Chave Pix" not in receipt.text
    assert "E1234567890ABCDE1234567890ABCDE1" in receipt.text
    assert "nota fiscal" in receipt.text
    assert "não garante abatimento no Imposto de Renda" in receipt.text
    assert "orientações oficiais do governo" in receipt.text
    assert client.get(receipt_url, headers=accounts["other_project_headers"]).status_code == 403
    assert client.get(receipt_url, headers=accounts["beneficiary_headers"]).status_code == 200

    donor_rows = client.get("/api/donations/mine", headers=accounts["donor_headers"]).json()
    assert len(donor_rows) == 1
    assert donor_rows[0]["status"] == "confirmed"
    assert donor_rows[0]["receipt_code"]
    assert donor_rows[0]["pix_key"] == "projeto-pix@example.test"
    project_rows = client.get("/api/donations/mine", headers=accounts["beneficiary_headers"]).json()
    assert [row["id"] for row in project_rows] == [donation_id]
    assert "pix_key" not in project_rows[0]


def test_pix_e2e_reference_is_required_unique_and_payment_report_is_owner_only(
    client, user_factory, organization_factory, login,
):
    accounts = setup_donation_accounts(client, user_factory, organization_factory, login)
    payload = {"project_id": accounts["project"]["id"], "amount_cents": 5000}
    first = client.post("/api/donations", headers=accounts["donor_headers"], json=payload).json()
    second = client.post("/api/donations", headers=accounts["donor_headers"], json=payload).json()
    path = f"/api/donations/{first['id']}/report-payment"
    valid = {"end_to_end_id": "E1234567890ABCDE1234567890ABCDE2"}

    assert client.post(path, json=valid).status_code == 401
    assert client.post(path, headers=accounts["person_headers"], json=valid).status_code == 404
    assert client.post(path, headers=accounts["other_project_headers"], json=valid).status_code == 403
    assert client.post(path, headers=accounts["donor_headers"], json={"end_to_end_id": "curto"}).status_code == 422
    assert client.post(path, headers=accounts["donor_headers"], json=valid).status_code == 200

    duplicate = client.post(f"/api/donations/{second['id']}/report-payment", headers=accounts["donor_headers"], json=valid)
    assert duplicate.status_code == 409
    assert client.post(path, headers=accounts["donor_headers"], json=valid).status_code == 409


def test_person_can_donate_report_payment_and_receive_private_cpf_receipt(
    client, user_factory, organization_factory, login,
):
    accounts = setup_donation_accounts(client, user_factory, organization_factory, login)
    person = accounts["person"]
    headers = accounts["person_headers"]
    project_id = accounts["project"]["id"]

    assert client.get("/api/projects", headers=headers).status_code == 200
    created = client.post("/api/donations", headers=headers, json={
        "project_id": project_id, "amount_cents": 2500,
    })
    assert created.status_code == 201, created.text
    donation_id = created.json()["id"]
    mine = client.get("/api/donations/mine", headers=headers)
    assert mine.status_code == 200
    assert [row["id"] for row in mine.json()] == [donation_id]
    assert mine.json()[0]["pix_key"] == "projeto-pix@example.test"
    assert mine.json()[0]["donor_document"] == person["document"]
    assert mine.json()[0]["donor_document_type"] == "person"

    reported = client.post(f"/api/donations/{donation_id}/report-payment", headers=headers, json={
        "end_to_end_id": "E1234567890ABCDE1234567890ABCDE9",
    })
    assert reported.status_code == 200, reported.text
    assert client.post(f"/api/donations/{donation_id}/confirm",
        headers=accounts["beneficiary_headers"]).status_code == 200
    receipt = client.get(f"/api/donations/{donation_id}/receipt", headers=headers)
    assert receipt.status_code == 200
    assert "CPF do doador" in receipt.text
    assert person["document"] in receipt.text
    assert "CNPJ da doadora" not in receipt.text
    assert client.get(f"/api/donations/{donation_id}/receipt",
        headers=accounts["other_project_headers"]).status_code == 403


def test_pix_review_queue_is_moderator_only_and_does_not_expose_keys_publicly(
    client, user_factory, organization_factory, login,
):
    owner = user_factory(kind="project", email="projeto-fila@example.test")
    donor = user_factory(kind="donor", email="doadora-fila@example.test")
    moderator = user_factory(kind="person", role="moderator", email="moderador-fila@example.test")
    project = organization_factory(owner, pix_key="pix-privado-fila@example.test")
    organization_factory(donor, kind="donor", name="Empresa da fila", organization_type="company")

    assert client.get("/api/moderation/projects/pix-review").status_code == 401
    assert client.get("/api/moderation/projects/pix-review", headers=login(donor)).status_code == 403
    response = client.get("/api/moderation/projects/pix-review", headers=login(moderator))
    assert response.status_code == 200
    candidate = next(item for item in response.json() if item["id"] == project["id"])
    assert candidate["pix_key"] == "pix-privado-fila@example.test"
    assert candidate["pix_key_verified_at"] is None
    public = client.get("/api/public/projects")
    assert "pix-privado-fila@example.test" not in public.text
    assert "pix-privado-fila@example.test" not in client.get("/api/moderation/projects/pix-review", headers=login(donor)).text


def test_changing_pix_key_revokes_review_and_owner_cannot_approve_own_project(
    client, user_factory, organization_factory, organization_data, login,
):
    owner = user_factory(kind="project", role="moderator", email="proprietario-moderador@example.test")
    donor = user_factory(kind="donor", email="doadora-revisao@example.test")
    project = organization_factory(owner, pix_key="chave-anterior@example.test")
    organization_factory(donor, kind="donor", name="Empresa revisão", organization_type="company")
    owner_headers = login(owner)
    donor_headers = login(donor)

    self_approval = client.patch(f"/api/moderation/projects/{project['id']}/pix-verification",
        headers=owner_headers, json={"verified": True})
    assert self_approval.status_code == 403

    reviewer = user_factory(kind="person", role="moderator", email="revisor-independente@example.test")
    reviewer_headers = login(reviewer)
    assert client.patch(f"/api/moderation/projects/{project['id']}/pix-verification",
        headers=reviewer_headers, json={"verified": True}).status_code == 200

    edited = client.patch(f"/api/organizations/{project['id']}", headers=owner_headers, json=organization_data(
        name=project["name"], pix_key="chave-nova@example.test",
    ))
    assert edited.status_code == 200, edited.text
    assert edited.json()["pix_key_verified_at"] is None
    donation = client.post("/api/donations", headers=donor_headers, json={
        "project_id": project["id"], "amount_cents": 1000,
    })
    assert donation.status_code == 409


@pytest.mark.parametrize("bad_project_id", [0, -1])
def test_donation_project_identifier_must_be_positive(client, user_factory, organization_factory, login, bad_project_id):
    donor = user_factory(kind="donor")
    organization_factory(donor, kind="donor", name="Empresa doadora", organization_type="company")
    response = client.post("/api/donations", headers=login(donor), json={"project_id": bad_project_id, "amount_cents": 100})
    assert response.status_code == 422
