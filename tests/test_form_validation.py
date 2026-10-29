import pytest


@pytest.mark.parametrize("path,method,labels", [
    ("/api/auth/login", "post", ["CPF ou CNPJ", "Senha"]),
    ("/api/auth/register", "post", ["Nome completo", "E-mail", "Senha"]),
    ("/api/auth/register-institution", "post", ["Nome completo", "CPF da pessoa responsável", "Organização"]),
    ("/api/profile", "patch", ["Nome completo"]),
    ("/api/organizations", "post", ["Nome da organização", "Cidade", "Estado", "Apresentação"]),
    ("/api/support", "post", ["Assunto", "Relato"]),
    ("/api/moderation/announcements", "post", ["Título", "Mensagem"]),
    ("/api/solana-payments/intents", "post", ["Valor da doação em SOL", "Destino da doação"]),
])
def test_missing_fields_are_named_in_portuguese_without_echoing_values(client, user_factory, login, path, method, labels):
    headers = login(user_factory(role="moderator"))
    response = client.request(method, path, headers=headers, json={})
    assert response.status_code == 422
    details = response.json()["detail"]
    text = " ".join(item["msg"] for item in details)
    for label in labels:
        assert label in text
    assert "Field required" not in text
    assert all(set(item) == {"type", "loc", "msg"} for item in details)


@pytest.mark.parametrize("field", ["subject", "message"])
def test_support_rejects_whitespace_without_creating_ticket(client, user_factory, login, field):
    headers = login(user_factory())
    payload = {"subject": "Dúvida de teste", "message": "Uma descrição completa para o suporte."}
    payload[field] = "   "
    response = client.post("/api/support", headers=headers, json=payload)
    assert response.status_code == 422
    assert "Preencha o campo" in response.json()["detail"][0]["msg"]
    assert client.get("/api/support/mine", headers=headers).json() == []


def test_required_blank_password_and_validation_errors_do_not_echo_secrets(client):
    response = client.post("/api/auth/login", json={"document": "11111111111", "password": "    "})
    assert response.status_code == 422
    assert "Senha" in response.json()["detail"][0]["msg"]
    secret = "PrivateTestPassword123!"
    response = client.post("/api/auth/register", json={"password": secret})
    assert response.status_code == 422
    assert secret not in response.text
    assert '"input"' not in response.text and '"ctx"' not in response.text


def test_nested_required_fields_identify_the_correct_label(client):
    response = client.post("/api/auth/register-institution", json={"organization": {}})
    assert response.status_code == 422
    details = response.json()["detail"]
    assert any(item["loc"] == ["body", "organization", "city"] and "Cidade" in item["msg"] for item in details)
