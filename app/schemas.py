import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


def valid_cnpj(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) != 14 or digits == digits[0] * 14:
        raise ValueError("Informe um CNPJ válido com 14 dígitos.")
    for length, weights in ((12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]), (13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])):
        total = sum(int(digits[i]) * weights[i] for i in range(length))
        remainder = total % 11
        check = 0 if remainder < 2 else 11 - remainder
        if check != int(digits[length]):
            raise ValueError("O CNPJ informado não passou na validação dos dígitos.")
    return digits


def valid_cpf(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) != 11 or digits == digits[0] * 11:
        raise ValueError("Informe um CPF válido com 11 dígitos.")
    for length in (9, 10):
        total = sum(int(digits[index]) * (length + 1 - index) for index in range(length))
        check = (total * 10) % 11
        if check == 10:
            check = 0
        if check != int(digits[length]):
            raise ValueError("O CPF informado não passou na validação dos dígitos.")
    return digits


class OrganizationInput(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    organization_type: Literal["company", "formal_ngo", "independent_project", "community_collective", "association", "religious_group", "student_project"]
    institution_kind: Literal["donor", "project"] = "project"
    cnpj: str | None = Field(default=None, max_length=18)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=2)
    founding_year: int | None = Field(default=None, ge=1800, le=2100)
    short_description: str = Field(min_length=10, max_length=280)
    objective: str | None = Field(default=None, max_length=2000)
    impact_summary: str | None = Field(default=None, max_length=2000)
    description: str | None = Field(default=None, max_length=5000)
    website_url: str | None = Field(default=None, max_length=500)
    instagram_url: str | None = Field(default=None, max_length=500)
    pix_key: str | None = Field(default=None, max_length=160)
    logo_url: str | None = Field(default=None, max_length=500)
    areas: list[str] = Field(default_factory=list, max_length=12)
    interested_services: list[str] = Field(default_factory=list, max_length=9)

    @field_validator("cnpj")
    @classmethod
    def check_cnpj(cls, value: str | None) -> str | None:
        return valid_cnpj(value) if value and value.strip() else None

    @field_validator("name", "city", "short_description", mode="before")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
        value = value.strip()
        if not value:
            raise ValueError("Este campo não pode ficar vazio.")
        return value

    @field_validator("state")
    @classmethod
    def check_state(cls, value: str) -> str:
        value = value.upper()
        states = {"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"}
        if value not in states:
            raise ValueError("Informe a sigla de um estado brasileiro válido.")
        return value

    @field_validator("website_url", "instagram_url", "logo_url")
    @classmethod
    def check_url(cls, value: str | None) -> str | None:
        if value and not re.match(r"^https?://[^\s]+$", value, flags=re.I):
            raise ValueError("Use uma URL válida iniciada por https://")
        return value

    @field_validator("areas")
    @classmethod
    def unique_areas(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(values))

    @model_validator(mode="after")
    def project_has_areas(self):
        if self.institution_kind == "project" and self.organization_type == "company":
            raise ValueError("O tipo Empresa é exclusivo de instituições doadoras.")
        if self.institution_kind == "project" and not self.areas:
            raise ValueError("Selecione ao menos uma área de atuação para o projeto social.")
        return self


class RegisterInput(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    password_confirmation: str
    phone: str | None = Field(default=None, max_length=30)
    responsible_title: str = Field(min_length=2, max_length=80)
    role: Literal["member", "volunteer"] = "member"
    organization: OrganizationInput | None = None
    document: str = Field(min_length=11, max_length=18)
    member_project_id: int | None = Field(default=None, ge=1)
    member_role: Literal["staff", "assisted"] | None = None

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[a-z0-9_]{3,30}", value):
            raise ValueError("Use de 3 a 30 caracteres: letras, números ou sublinhado.")
        return value

    @field_validator("full_name", "responsible_title")
    @classmethod
    def trim_account_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Este campo não pode ficar vazio.")
        return value

    @model_validator(mode="after")
    def password_matches(self):
        if self.password != self.password_confirmation:
            raise ValueError("As senhas não coincidem.")
        return self

    @field_validator("document")
    @classmethod
    def normalize_document(cls, value: str) -> str:
        return valid_cpf(value)


class InstitutionRegisterInput(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    document: str = Field(min_length=14, max_length=18)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    password_confirmation: str
    phone: str | None = Field(default=None, max_length=30)
    institution_kind: Literal["donor", "project"]
    organization: OrganizationInput

    @field_validator("document")
    @classmethod
    def normalize_document(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if len(digits) != 14:
            raise ValueError("Informe um CNPJ com 14 dígitos.")
        return digits

    @model_validator(mode="after")
    def password_matches_and_kind(self):
        if self.password != self.password_confirmation:
            raise ValueError("As senhas não coincidem.")
        if self.organization.institution_kind != self.institution_kind:
            raise ValueError("O tipo da instituição não corresponde ao perfil selecionado.")
        if self.institution_kind == "project" and (not self.organization.objective or not self.organization.objective.strip()):
            raise ValueError("Informe os objetivos do projeto social.")
        if self.institution_kind == "project" and (not self.organization.impact_summary or not self.organization.impact_summary.strip()):
            raise ValueError("Informe os impactos ou resultados do projeto social.")
        return self


class LoginInput(BaseModel):
    document: str = Field(min_length=11, max_length=18)
    password: str
    account_type: Literal["donor", "project"] = "project"

    @field_validator("document")
    @classmethod
    def normalize_document(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if len(digits) not in (11, 14):
            raise ValueError("Informe um CPF ou CNPJ válido.")
        return digits


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    responsible_title: str | None = Field(default=None, max_length=80)


class OrganizationCreate(OrganizationInput):
    model_config = ConfigDict(extra="forbid")


class TicketInput(BaseModel):
    subject: str = Field(min_length=4, max_length=140)
    message: str = Field(min_length=10, max_length=4000)


class TicketStatusInput(BaseModel):
    status: Literal["open", "in_progress", "resolved"]


class AnnouncementInput(BaseModel):
    title: str = Field(min_length=4, max_length=160)
    body: str = Field(min_length=10, max_length=3000)
    category: str = Field(default="plataforma", max_length=40)
