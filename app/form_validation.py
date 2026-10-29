"""Human-readable validation errors without echoing submitted values."""

FIELD_LABELS = {
    "full_name": "Nome completo", "document": "CPF ou CNPJ", "responsible_cpf": "CPF da pessoa responsável",
    "username": "Nome de usuário", "email": "E-mail", "password": "Senha",
    "password_confirmation": "Confirmação de senha", "responsible_title": "Ocupação ou função",
    "name": "Nome da organização", "organization": "Organização", "organization_type": "Tipo de organização",
    "state": "Estado", "city": "Cidade", "cnpj": "CNPJ", "short_description": "Apresentação",
    "objective": "Objetivos do projeto", "impact_summary": "Resultados e impacto", "areas": "Áreas de atuação",
    "subject": "Assunto", "message": "Relato", "title": "Título", "body": "Mensagem", "category": "Categoria",
    "amount_lamports": "Valor da doação em SOL", "amount_cents": "Valor da doação em reais",
    "project_id": "Projeto social", "member_project_id": "Projeto social", "member_role": "Vínculo com o projeto",
    "account_type": "Tipo de conta", "institution_kind": "Tipo de instituição", "status": "Status",
    "end_to_end_id": "Identificador E2E", "target": "Destino da doação",
    "phone": "Telefone", "founding_year": "Ano de fundação", "description": "Descrição",
    "website_url": "Site", "instagram_url": "Instagram", "pix_key": "Chave Pix", "logo_url": "Logo",
    "interested_services": "Serviços de interesse", "role": "Perfil de acesso", "verified": "Verificação",
}


def field_label(location):
    parts = list(location)
    if parts and parts[0] in {"body", "query", "path"}:
        parts = parts[1:]
    fields = [item for item in parts if isinstance(item, str)]
    return FIELD_LABELS.get(fields[-1], fields[-1].replace("_", " ")) if fields else "Formulário"


def validation_detail(error):
    label = field_label(error.get("loc", ()))
    value = error.get("input")
    kind = error["type"]
    if kind == "missing" or value is None or (isinstance(value, str) and not value.strip()):
        message = f"Preencha o campo “{label}” para continuar."
    elif kind == "string_too_short":
        message = f"O campo “{label}” precisa ter ao menos {error['ctx']['min_length']} caracteres."
    elif kind == "string_too_long":
        message = f"O campo “{label}” deve ter até {error['ctx']['max_length']} caracteres."
    elif label == "E-mail":
        message = "Informe um e-mail válido."
    elif kind == "value_error":
        message = error["msg"].removeprefix("Value error, ")
    else:
        message = f"Revise o campo “{label}” para continuar."
    return {"type": kind, "loc": list(error.get("loc", ())), "msg": message}
