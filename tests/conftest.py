"""Real PostgreSQL tests in a unique, disposable namespace; no application URL fallback."""
import importlib
import os
from pathlib import Path
import re
import sys
from unittest.mock import patch
from uuid import uuid4

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, delete, insert
from sqlalchemy.engine import make_url
from sqlalchemy.schema import CreateSchema, DropSchema

PASSWORD = "LocalTestPassword123!"
ROOT = Path(__file__).resolve().parents[1]


def pytest_configure(config):
    imported = {"app.config", "app.database", "app.main"}.intersection(sys.modules)
    if imported:
        raise pytest.UsageError("Run pytest in a fresh process before importing app modules.")
    test_url = os.getenv("SOCIALTRADE_TEST_DATABASE_URL")
    if not test_url or make_url(test_url).drivername != "postgresql+psycopg":
        raise pytest.UsageError("Configure SOCIALTRADE_TEST_DATABASE_URL explicitamente para um PostgreSQL de testes.")
    config._socialtrade_schema = f"st_pytest_{uuid4().hex}"
    config._socialtrade_admin_engine = create_engine(test_url)
    config._socialtrade_environment = patch.dict(os.environ, {
        "SOCIALTRADE_DATABASE_URL": test_url,
        "SOCIALTRADE_DATABASE_SCHEMA": config._socialtrade_schema,
        "SOCIALTRADE_DEMO_USERS": "false",
        "SOCIALTRADE_TOKEN_SECRET": "isolated-pytest-secret-not-a-production-key",
        "PYTHON_DOTENV_DISABLED": "1", "PYTHONDONTWRITEBYTECODE": "1",
    })
    config._socialtrade_environment.start()
    config._socialtrade_dotenv = patch("dotenv.load_dotenv", return_value=False)
    config._socialtrade_dotenv.start()
    config._socialtrade_bytecode = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    migration = Config(str(ROOT / "alembic.ini"))
    migration.set_main_option("script_location", str(ROOT / "migrations"))
    with config._socialtrade_admin_engine.begin() as connection:
        connection.execute(CreateSchema(config._socialtrade_schema))
        connection.exec_driver_sql(f'SET search_path TO "{config._socialtrade_schema}"')
        migration.attributes["connection"] = connection
        command.upgrade(migration, "head")


def pytest_unconfigure(config):
    if hasattr(config, "_socialtrade_environment"):
        database = sys.modules.get("app.database")
        if database:
            database.engine.dispose()
        schema = config._socialtrade_schema
        assert re.fullmatch(r"st_pytest_[0-9a-f]{32}", schema)
        with config._socialtrade_admin_engine.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True, if_exists=True))
        config._socialtrade_admin_engine.dispose()
        config._socialtrade_dotenv.stop()
        config._socialtrade_environment.stop()
        sys.dont_write_bytecode = config._socialtrade_bytecode


@pytest.fixture(scope="session")
def api(pytestconfig):
    module = importlib.import_module("app.main")
    settings = importlib.import_module("app.config")
    assert settings.DATABASE_URL == os.environ["SOCIALTRADE_TEST_DATABASE_URL"]
    assert settings.DATABASE_SCHEMA == pytestconfig._socialtrade_schema
    assert settings.DEMO_USERS_ENABLED is False
    return module


@pytest.fixture(autouse=True)
def isolated_database(api, pytestconfig):
    models = importlib.import_module("app.models")
    assert importlib.import_module("app.database").engine.url == pytestconfig._socialtrade_admin_engine.url
    with api.transaction() as db:
        assert db.exec_driver_sql("SELECT current_schema()").scalar_one() == pytestconfig._socialtrade_schema
        for name in ("support_tickets", "project_memberships", "organization_services", "organization_areas", "organizations", "users", "announcements"):
            db.execute(delete(getattr(models, name)))


@pytest.fixture
def db_connection(api, isolated_database):
    with api.connect() as connection:
        with connection.begin() as rollback:
            yield connection
            rollback.rollback()


@pytest.fixture
def client(api, isolated_database):
    with TestClient(api.app) as instance:
        yield instance


@pytest.fixture(scope="session")
def password_hash(api):
    return api.hash_password(PASSWORD)


def fictitious_document(number, kind):
    """Deterministic synthetic values with valid check digits, never real fixtures."""
    if kind == "person":
        result = f"90000{number:04d}"
        for length in (9, 10):
            check = sum(int(value) * (length + 1 - index) for index, value in enumerate(result)) * 10 % 11
            result += str(check if check < 10 else 0)
        return result
    result = f"90{number:06d}0001"
    for weights in ((5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2), (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)):
        remainder = sum(int(value) * weight for value, weight in zip(result, weights)) % 11
        result += str(0 if remainder < 2 else 11 - remainder)
    return result


@pytest.fixture
def user_factory(api, password_hash):
    users = importlib.import_module("app.models").users
    serial = 0
    def create(*, kind="person", role="member", document=None, email=None, username=None):
        nonlocal serial
        serial += 1
        document = document or fictitious_document(serial, kind)
        email = email or f"account{serial}@example.org"
        with api.transaction() as db:
            user_id = db.execute(insert(users).values(
                full_name=f"Pessoa de teste {serial}", username=username or f"account_{serial}", email=email,
                password_hash=password_hash, document=document, account_type=kind, role=role,
                registration_number=f"{serial:06d}" if kind == "person" else None,
            ).returning(users.c.id)).scalar_one()
        return {"id": user_id, "document": document, "email": email, "kind": kind, "role": role}
    return create


@pytest.fixture
def login(client):
    def authenticate(user):
        response = client.post("/api/auth/login", json={
            "document": user["document"], "password": PASSWORD,
            "account_type": "donor" if user["kind"] == "donor" else "project",
        })
        assert response.status_code == 200, response.text
        return {"Authorization": "Bearer " + response.json()["access_token"]}
    return authenticate


@pytest.fixture
def organization_data():
    def payload(kind="project", **overrides):
        result = {
            "name": "Projeto de teste", "institution_kind": kind,
            "organization_type": "independent_project" if kind == "project" else "company",
            "cnpj": "11222333000181", "city": "São Paulo", "state": "SP",
            "short_description": "Educação e alimentação para nossa comunidade.",
            "objective": "Ampliar o acesso à educação." if kind == "project" else None,
            "impact_summary": "Cinquenta famílias atendidas." if kind == "project" else None,
            "areas": ["education", "food"] if kind == "project" else [],
            "interested_services": ["public_profile"],
        }
        result.update(overrides)
        return result
    return payload


@pytest.fixture
def organization_factory(api, organization_data):
    def create(owner, kind=None, **overrides):
        payload = organization_data(kind or owner["kind"], **overrides)
        with api.transaction() as db:
            identifier = api.create_org(db, owner["id"], payload)
        return {"id": identifier, **payload}
    return create


@pytest.fixture
def person_data():
    def payload(**overrides):
        result = {
            "full_name": "Pessoa de teste", "username": "nova_pessoa",
            "email": "nova-pessoa@example.org", "document": "52998224725",
            "password": PASSWORD, "password_confirmation": PASSWORD,
            "responsible_title": "Voluntária", "role": "member",
        }
        result.update(overrides)
        return result
    return payload


@pytest.fixture
def institution_data(organization_data):
    def payload(kind="project", **overrides):
        result = {
            "full_name": "Responsável da instituição", "email": "instituicao@example.org",
            "document": "11222333000181", "password": PASSWORD,
            "password_confirmation": PASSWORD, "institution_kind": kind,
            "organization": organization_data(kind),
        }
        result.update(overrides)
        return result
    return payload
