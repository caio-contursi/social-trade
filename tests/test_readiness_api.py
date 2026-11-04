from contextlib import contextmanager

from sqlalchemy.exc import OperationalError


def test_readiness_accepts_migrated_database(client):
    response = client.get("/api/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readiness_rejects_old_revision_even_when_database_responds(client, api, monkeypatch):
    connect = api.connect

    @contextmanager
    def stale_database():
        with connect() as db:
            db.exec_driver_sql("UPDATE alembic_version SET version_num = 'outdated'")
            yield db

    monkeypatch.setattr(api, "connect", stale_database)
    assert client.get("/api/health").status_code == 200
    response = client.get("/api/ready")
    assert response.status_code == 503
    assert "outdated" not in response.text


def test_readiness_hides_database_errors(client, api, monkeypatch):
    def unavailable():
        raise OperationalError("SELECT 1", {}, RuntimeError("dados privados"))

    monkeypatch.setattr(api, "connect", unavailable)
    response = client.get("/api/ready")
    assert response.status_code == 503
    assert response.json() == {"detail": "Banco de dados indisponível."}
