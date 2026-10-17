"""Isolated API fixtures: no real .env, SQLite database, or demo seeding."""
import importlib
import os
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch

from fastapi.testclient import TestClient
import pytest

PASSWORD = "LocalTestPassword123!"


def pytest_configure(config):
    imported = {"app.config", "app.database", "app.main"}.intersection(sys.modules)
    if imported:
        raise pytest.UsageError("Run pytest in a fresh process before importing app modules.")
    temporary = tempfile.TemporaryDirectory(prefix="socialtrade-pytest-")
    config._socialtrade_temporary = temporary
    config._socialtrade_environment = patch.dict(os.environ, {
        "SOCIALTRADE_DB": str(Path(temporary.name) / "isolated.sqlite"),
        "SOCIALTRADE_DEMO_USERS": "false",
        "SOCIALTRADE_TOKEN_SECRET": "isolated-pytest-secret-not-a-production-key",
        "PYTHON_DOTENV_DISABLED": "1", "PYTHONDONTWRITEBYTECODE": "1",
    })
    config._socialtrade_environment.start()
    config._socialtrade_dotenv = patch("dotenv.load_dotenv", return_value=False)
    config._socialtrade_dotenv.start()
    config._socialtrade_bytecode = sys.dont_write_bytecode
    sys.dont_write_bytecode = True


def pytest_unconfigure(config):
    if hasattr(config, "_socialtrade_environment"):
        config._socialtrade_dotenv.stop()
        config._socialtrade_environment.stop()
        sys.dont_write_bytecode = config._socialtrade_bytecode
        config._socialtrade_temporary.cleanup()


@pytest.fixture(scope="session")
def api(pytestconfig):
    module = importlib.import_module("app.main")
    settings = importlib.import_module("app.config")
    expected = Path(pytestconfig._socialtrade_temporary.name) / "isolated.sqlite"
    assert settings.DATABASE_PATH.resolve() == expected.resolve()
    assert settings.DEMO_USERS_ENABLED is False
    return module


@pytest.fixture(autouse=True)
def isolated_database(api):
    with api.transaction() as db:
        db.execute("DELETE FROM users")
        db.execute("DELETE FROM announcements")
    api.initialize()


@pytest.fixture
def client(api, isolated_database):
    with TestClient(api.app) as instance:
        yield instance


@pytest.fixture(scope="session")
def password_hash(api):
    return api.hash_password(PASSWORD)


@pytest.fixture
def user_factory(api, password_hash):
    serial = 0
    def create(*, kind="person", role="member", document=None, email=None):
        nonlocal serial
        serial += 1
        document = document or f"9000000{serial:04d}"
        email = email or f"account{serial}@example.org"
        with api.transaction() as db:
            user_id = db.execute(
                "INSERT INTO users (full_name,username,email,password_hash,document,account_type,role) "
                "VALUES (?,?,?,?,?,?,?)",
                (f"Pessoa de teste {serial}", f"account_{serial}", email, password_hash, document, kind, role),
            ).lastrowid
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
