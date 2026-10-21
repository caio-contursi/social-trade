"""Canonical CPF/CNPJ values, including the alphanumeric CNPJ specification."""
import re


CPF_SHAPE = re.compile(r"(?:[0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})")
CNPJ_SHAPE = re.compile(r"(?:[A-Z0-9]{12}[0-9]{2}|[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}/[A-Z0-9]{4}-[0-9]{2})")


def normalize_document(value: str, *, kind: str | None = None) -> str:
    value = value.strip()
    if not value.isascii():
        raise ValueError("Use apenas letras ASCII e números no CPF ou CNPJ.")
    value = value.upper()
    shapes = {"cpf": CPF_SHAPE, "cnpj": CNPJ_SHAPE}
    allowed = [shapes[kind]] if kind else list(shapes.values())
    if not any(shape.fullmatch(value) for shape in allowed):
        raise ValueError("Informe um CPF ou CNPJ válido, sem máscara ou com a máscara padrão.")
    return value.translate(str.maketrans("", "", "./-"))


def valid_cnpj(value: str) -> str:
    document = normalize_document(value, kind="cnpj")
    if document == document[0] * 14:
        raise ValueError("Informe um CNPJ válido.")
    for length, weights in ((12, (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)), (13, (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2))):
        # Receita Federal: ASCII code minus 48, for both digits and letters.
        total = sum((ord(document[index]) - 48) * weights[index] for index in range(length))
        remainder = total % 11
        check = 0 if remainder < 2 else 11 - remainder
        if check != int(document[length]):
            raise ValueError("O CNPJ informado não passou na validação dos dígitos.")
    return document


def valid_cpf(value: str) -> str:
    document = normalize_document(value, kind="cpf")
    if document == document[0] * 11:
        raise ValueError("Informe um CPF válido com 11 dígitos.")
    for length in (9, 10):
        total = sum(int(document[index]) * (length + 1 - index) for index in range(length))
        check = (total * 10) % 11
        if check == 10:
            check = 0
        if check != int(document[length]):
            raise ValueError("O CPF informado não passou na validação dos dígitos.")
    return document
