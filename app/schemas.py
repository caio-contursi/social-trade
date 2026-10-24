import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, ValidationInfo, field_validator, model_validator
from app.documents import normalize_document, valid_cnpj, valid_cpf


class PostgresInput(BaseModel):
    @field_validator("*")
    @classmethod
    def reject_nul_text(cls, value, info: ValidationInfo):
        # Passwords are hashed; their raw value is never sent to PostgreSQL.
        if info.field_name not in {"password", "password_confirmation"} and isinstance(value, str) and "\x00" in value:
            raise ValueError("O caractere NUL não é permitido neste campo.")
        return value


class OrganizationInput(PostgresInput):
    name: str = Field(min_length=2, max_length=160)
    organization_type: str = Field(min_length=1, max_length=80)
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


class RegisterInput(PostgresInput):
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

    @field_validator("full_name", "responsible_title", mode="before")
    @classmethod
    def trim_account_text(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
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


class InstitutionRegisterInput(PostgresInput):
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
        return valid_cnpj(value)

    @field_validator("full_name", mode="before")
    @classmethod
    def trim_full_name(cls, value):
        return value.strip() if isinstance(value, str) else value

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


class LoginInput(PostgresInput):
    document: str = Field(min_length=11, max_length=18)
    password: str
    account_type: Literal["donor", "project"] = "project"

    @field_validator("document")
    @classmethod
    def normalize_document(cls, value: str) -> str:
        # Legacy demo CPFs still authenticate. Registration separately validates DV.
        return normalize_document(value)


class ProfileUpdate(PostgresInput):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    responsible_title: str | None = Field(default=None, max_length=80)

    @field_validator("full_name", "responsible_title", mode="before")
    @classmethod
    def trim_profile_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class OrganizationCreate(OrganizationInput):
    model_config = ConfigDict(extra="forbid")


class TicketInput(PostgresInput):
    subject: str = Field(min_length=4, max_length=140)
    message: str = Field(min_length=10, max_length=4000)

    @field_validator("subject", "message", mode="before")
    @classmethod
    def trim_ticket_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class TicketStatusInput(PostgresInput):
    status: Literal["open", "in_progress", "resolved"]


class AnnouncementInput(PostgresInput):
    title: str = Field(min_length=4, max_length=160)
    body: str = Field(min_length=10, max_length=3000)
    category: str = Field(default="plataforma", min_length=1, max_length=40)

    @field_validator("title", "body", "category", mode="before")
    @classmethod
    def trim_announcement_text(cls, value):
        return value.strip() if isinstance(value, str) else value
