"""Migration regressions use synthetic SQLite files and a real isolated PostgreSQL."""
import hashlib
import json
import os
from pathlib import Path
import sqlite3

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError

from app import migrate_sqlite as migration
from app import models


@pytest.fixture
def legacy_source(tmp_path, password_hash):
    def create(*, without_email_unique=False, empty=False):
        path = tmp_path / ("legacy-loose.sqlite" if without_email_unique else "legacy.sqlite")
        ddl = (Path(__file__).parent / "fixtures/legacy_schema.sql").read_text(encoding="utf-8")
        if without_email_unique:
            ddl = ddl.replace("email TEXT NOT NULL UNIQUE COLLATE NOCASE", "email TEXT NOT NULL")
        with sqlite3.connect(path) as db:
            db.executescript(ddl)
            if not empty:
                db.execute("INSERT INTO users (id,full_name,username,email,password_hash,document,account_type,registration_number,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
                           (42, "Pessoa fictícia", "legado", "legado@example.org", password_hash, "52998224725", "person", "001234", "2026-10-17 05:43:21"))
                db.execute("INSERT INTO organizations (id,owner_id,name,slug,organization_type,institution_kind,city,state,short_description,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                           (88, 42, "Projeto fictício", "projeto-ficticio", "independent_project", "project", "São Paulo", "SP", "Projeto de educação para teste.", "2026-10-17 06:00:00"))
                db.execute("INSERT INTO organization_areas VALUES (88,'education')")
                db.execute("INSERT INTO organization_services VALUES (88,'public_profile',1)")
                db.execute("INSERT INTO project_memberships (user_id,organization_id,member_role,created_at) VALUES (42,88,'staff','2026-10-17 06:00:00')")
                db.execute("INSERT INTO announcements (id,title,body,published_at) VALUES (9,'Aviso fictício','Aviso criado exclusivamente para o teste.','2026-10-17 06:00:00')")
        return path
    return create


@pytest.fixture
def pg_engine(api):
    from app.database import engine
    return engine


def change(path, sql, params=()):
    with sqlite3.connect(path) as db:
        db.execute(sql, params)


def count(engine, table=models.users):
    with engine.connect() as db:
        return db.execute(select(func.count()).select_from(table)).scalar_one()


def test_preflight_is_read_only_and_does_not_copy(legacy_source, pg_engine):
    path = legacy_source()
    original = path.read_bytes()
    result = migration.migrate(path, pg_engine)
    assert result["status"] == "ready"
    assert result["counts"]["users"] == 1
    assert result["problems"] == []
    assert count(pg_engine) == 0
    assert path.read_bytes() == original


def test_import_preserves_data_login_dates_relationships_and_identities(legacy_source, pg_engine, client):
    path = legacy_source()
    original_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    result = migration.migrate(path, pg_engine, apply=True)
    assert result["status"] == "imported"
    assert all(len(item["checksum"]) == 64 for item in result["verified"].values())
    assert result["verified"]["organization_services"]["count"] == 1
    response = client.post("/api/auth/login", json={"document": "529.982.247-25", "password": "LocalTestPassword123!", "account_type": "project"})
    assert response.status_code == 200
    assert response.json()["user"]["id"] == 42
    assert response.json()["user"]["registration_number"] == "001234"
    with pg_engine.begin() as db:
        row = db.execute(select(models.users)).mappings().one()
        assert row["created_at"].isoformat() == "2026-10-17T05:43:21+00:00"
        assert db.execute(select(models.organizations.c.slug)).scalar_one() == "projeto-ficticio"
        imported_org = db.execute(select(models.organizations)).mappings().one()
        assert imported_org["pix_key_verified_at"] is None
        assert imported_org["pix_key_verified_by_user_id"] is None
        assert db.execute(select(models.project_memberships.c.organization_kind)).scalar_one() == "project"
        next_id = db.execute(models.announcements.insert().values(title="Outro", body="Outro aviso").returning(models.announcements.c.id)).scalar_one()
        assert next_id == 10
        assert db.execute(models.support_tickets.insert().values(user_id=42, subject="Ajuda", message="Mensagem fictícia").returning(models.support_tickets.c.id)).scalar_one() == 1
        assert db.execute(models.users.insert().values(full_name="Outra pessoa", username="outra", email="outra@example.org", password_hash="synthetic-hash", document="11144477735", account_type="person", registration_number="001235").returning(models.users.c.id)).scalar_one() == 43
    assert hashlib.sha256(path.read_bytes()).hexdigest() == original_hash


def test_empty_source_imports_and_restarts_empty_identities(legacy_source, pg_engine):
    result = migration.migrate(legacy_source(empty=True), pg_engine, apply=True)
    assert result["status"] == "imported"
    with pg_engine.begin() as db:
        assert db.execute(models.announcements.insert().values(title="Aviso", body="Teste").returning(models.announcements.c.id)).scalar_one() == 1


def test_destination_with_data_is_never_overwritten(legacy_source, pg_engine, user_factory):
    user_factory()
    with pytest.raises(migration.MigrationError, match="destination_not_empty"):
        migration.migrate(legacy_source(), pg_engine, apply=True)
    assert count(pg_engine) == 1


@pytest.mark.parametrize(("statement", "code"), [
    ("UPDATE users SET document='00000000000'", "invalid_cpf"),
    ("UPDATE users SET username=NULL", "required_value_missing"),
    ("UPDATE users SET username='!bad!'", "invalid_username"),
    ("UPDATE users SET email='no-at-sign'", "invalid_email"),
    ("UPDATE users SET password_hash='not-a-password-hash'", "invalid_password_hash"),
    ("UPDATE organizations SET logo_url='javascript:bad'", "invalid_url"),
    ("UPDATE users SET created_at='2026-10-17'", "invalid_timestamp"),
    ("UPDATE users SET document='sensitive-invalid-value'", "invalid_document_format"),
    ("UPDATE users SET registration_number=NULL", "invalid_registration_number"),
    ("UPDATE users SET registration_number='123'", "invalid_registration_number"),
    ("UPDATE users SET created_at='not-a-date'", "invalid_timestamp"),
    ("UPDATE organizations SET cnpj='00000000000000'", "invalid_cnpj"),
    ("UPDATE organizations SET state='XX'", "invalid_state"),
    ("UPDATE organizations SET founding_year=1700", "invalid_founding_year"),
    ("UPDATE organization_services SET interested=0", "legacy_interest_requires_decision"),
    ("UPDATE organization_areas SET area_code='not-a-catalog-code'", "unknown_catalog_code"),
    ("UPDATE organizations SET organization_type='not-a-type'", "unknown_catalog_code"),
])
def test_invalid_source_blocks_without_disclosing_record_values(legacy_source, pg_engine, statement, code):
    path = legacy_source()
    change(path, statement)
    result = migration.migrate(path, pg_engine, apply=True)
    assert result["status"] == "blocked"
    assert code in {issue["code"] for issue in result["problems"]}
    assert count(pg_engine) == 0
    assert "sensitive-invalid-value" not in json.dumps(result)
    assert "legado@example.org" not in json.dumps(result)


def test_only_explicit_known_demo_cpf_exception_is_accepted(legacy_source, pg_engine):
    path = legacy_source()
    change(path, "UPDATE users SET document='11111111111',email='user1@socialtrade.local'")
    blocked = migration.migrate(path, pg_engine)
    assert blocked["status"] == "blocked"
    accepted = migration.migrate(path, pg_engine, apply=True, allow_demo_documents=True)
    assert accepted["status"] == "imported"
    assert accepted["warnings"][0]["code"] == "explicit_demo_cpf_exception"


@pytest.mark.parametrize(("doc", "email"), [("11111111111", "real@example.org"), ("99999999999", "user1@socialtrade.local")])
def test_demo_exception_does_not_allow_other_invalid_documents(legacy_source, pg_engine, doc, email):
    path = legacy_source()
    change(path, "UPDATE users SET document=?,email=?", (doc, email))
    assert migration.migrate(path, pg_engine, allow_demo_documents=True)["status"] == "blocked"


def test_pg_case_insensitive_duplicate_is_detected_before_copy(legacy_source, pg_engine):
    path = legacy_source(without_email_unique=True)
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO users (id,full_name,username,email,password_hash,document,account_type,registration_number,created_at) SELECT 43,full_name,'outra','LEGADO@example.org',password_hash,'11144477735',account_type,'001235',created_at FROM users WHERE id=42")
    result = migration.migrate(path, pg_engine, apply=True)
    assert {issue["code"] for issue in result["problems"]} == {"duplicate_case_insensitive"}
    assert count(pg_engine) == 0


def test_failed_verification_rolls_back_every_table(legacy_source, pg_engine, monkeypatch):
    def failure(*args):
        raise migration.MigrationError("verification_failed")
    monkeypatch.setattr(migration, "_verify_import", failure)
    with pytest.raises(migration.MigrationError, match="verification_failed"):
        migration.migrate(legacy_source(), pg_engine, apply=True)
    for name in migration.TABLES:
        assert count(pg_engine, models.metadata.tables[name]) == 0


def test_source_changed_before_copy_blocks(legacy_source, pg_engine, monkeypatch):
    path = legacy_source()
    real = migration.fingerprint
    calls = 0
    def changed(item):
        nonlocal calls
        calls += 1
        return real(item) if calls <= 2 else "different"
    monkeypatch.setattr(migration, "fingerprint", changed)
    with pytest.raises(migration.MigrationError, match="source_changed"):
        migration.migrate(path, pg_engine, apply=True)
    assert count(pg_engine) == 0


def test_unsupported_source_is_reported_without_app_initialization(tmp_path):
    with pytest.raises(migration.MigrationError, match="source_not_readable"):
        migration.read_snapshot(tmp_path / "missing.sqlite")
    path = tmp_path / "not-sqlite"
    path.write_text("sensitive contents", encoding="utf-8")
    with pytest.raises(migration.MigrationError, match="source_read_error"):
        migration.read_snapshot(path)
    path.unlink()
    with sqlite3.connect(path) as db:
        db.execute("CREATE TABLE something (id INTEGER)")
    with pytest.raises(migration.MigrationError, match="unsupported_source_tables"):
        migration.read_snapshot(path)


@pytest.mark.parametrize(("url", "schema", "error"), [
    ("invalid-url", None, "invalid_destination_url"),
    ("sqlite://", None, "destination_must_be_postgresql"),
    ("postgresql://localhost/test", "public;drop", "invalid_destination_schema"),
])
def test_destination_configuration_rejects_unsafe_inputs(url, schema, error):
    with pytest.raises(migration.MigrationError, match=error):
        migration.destination_engine(url, schema)


def test_cli_defaults_to_check_writes_safe_report_and_refuses_source_overwrite(legacy_source, tmp_path, monkeypatch, capsys):
    path = legacy_source()
    report_path = tmp_path / "report.json"
    assert migration.main(["--source", str(path), "--report", str(report_path)]) == 0
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["status"] == "ready"
    assert "password_hash" not in report_path.read_text(encoding="utf-8")
    with pytest.raises(SystemExit):
        migration.main(["--source", str(path), "--report", str(path)])
    monkeypatch.delenv("SOCIALTRADE_DATABASE_URL")
    assert migration.main(["--source", str(path)]) == 2
    assert "destination_url_required" in capsys.readouterr().out


def test_database_error_is_sanitized_and_rolled_back(legacy_source, pg_engine, monkeypatch):
    def failure(*args):
        raise SQLAlchemyError("password=do-not-disclose")
    monkeypatch.setattr(migration, "_verify_import", failure)
    with pytest.raises(migration.MigrationError) as failure_info:
        migration.migrate(legacy_source(), pg_engine, apply=True)
    assert str(failure_info.value) == "destination_operation_failed"
    assert count(pg_engine) == 0


@pytest.mark.parametrize("revision", [None, "unknown_revision"])
def test_destination_revision_must_match_alembic_head(legacy_source, pg_engine, revision):
    with pg_engine.begin() as db:
        old = db.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        db.execute(text("DELETE FROM alembic_version"))
        if revision:
            db.execute(text("INSERT INTO alembic_version VALUES (:value)"), {"value": revision})
    try:
        with pytest.raises(migration.MigrationError, match="destination_revision_mismatch"):
            migration.migrate(legacy_source(), pg_engine, apply=True)
        assert count(pg_engine) == 0
    finally:
        with pg_engine.begin() as db:
            db.execute(text("DELETE FROM alembic_version"))
            db.execute(text("INSERT INTO alembic_version VALUES (:value)"), {"value": old})


def test_destination_missing_check_constraint_cannot_be_imported(legacy_source, pg_engine):
    with pg_engine.begin() as db:
        definition = db.execute(text("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='users'::regclass AND conname='ck_users_role'")).scalar_one()
        db.exec_driver_sql('ALTER TABLE users DROP CONSTRAINT ck_users_role')
    try:
        with pytest.raises(migration.MigrationError, match="destination_check_constraints_mismatch"):
            migration.migrate(legacy_source(), pg_engine, apply=True)
        assert count(pg_engine) == 0
    finally:
        with pg_engine.begin() as db:
            db.exec_driver_sql('ALTER TABLE users ADD CONSTRAINT ck_users_role ' + definition)


def test_destination_missing_index_cannot_be_imported(legacy_source, pg_engine):
    with pg_engine.begin() as db:
        db.exec_driver_sql('DROP INDEX ix_users_email_lower')
    try:
        with pytest.raises(migration.MigrationError, match="destination_structure_mismatch"):
            migration.migrate(legacy_source(), pg_engine, apply=True)
        assert count(pg_engine) == 0
    finally:
        with pg_engine.begin() as db:
            db.exec_driver_sql('CREATE UNIQUE INDEX ix_users_email_lower ON users(lower(email))')


def test_source_contract_limits_block_without_truncation(legacy_source, pg_engine):
    path = legacy_source()
    original_name = "x" * 121
    change(path, "UPDATE users SET full_name=?", (original_name,))
    result = migration.migrate(path, pg_engine, apply=True)
    assert "invalid_text_length" in {issue["code"] for issue in result["problems"]}
    assert count(pg_engine) == 0
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT full_name FROM users").fetchone()[0] == original_name


def test_fingerprint_change_after_inserts_rolls_back(legacy_source, pg_engine, monkeypatch):
    path = legacy_source()
    real = migration.fingerprint
    calls = 0
    def changed(item):
        nonlocal calls
        calls += 1
        return real(item) if calls <= 3 else "different"
    monkeypatch.setattr(migration, "fingerprint", changed)
    with pytest.raises(migration.MigrationError, match="source_changed"):
        migration.migrate(path, pg_engine, apply=True)
    assert calls == 4
    assert count(pg_engine) == 0
    assert count(pg_engine, models.organizations) == 0


def test_identity_restart_is_rolled_back_on_failure(legacy_source, pg_engine, monkeypatch):
    source = legacy_source()
    change(source, "UPDATE sqlite_sequence SET seq=1000 WHERE name='announcements'")
    with pg_engine.begin() as db:
        previous = db.execute(text("SELECT nextval(pg_get_serial_sequence('announcements','id'))")).scalar_one()
    real = migration._restart_identities
    def failure_after_restart(db, snapshot):
        real(db, snapshot)
        raise migration.MigrationError("forced_failure_after_restart")
    monkeypatch.setattr(migration, "_restart_identities", failure_after_restart)
    with pytest.raises(migration.MigrationError, match="forced_failure_after_restart"):
        migration.migrate(source, pg_engine, apply=True)
    assert count(pg_engine) == 0
    with pg_engine.begin() as db:
        assert db.execute(text("SELECT nextval(pg_get_serial_sequence('announcements','id'))")).scalar_one() == previous + 1


def test_checksum_mismatch_rolls_back(legacy_source, pg_engine, monkeypatch):
    real = migration._verify_import
    def altered_copy(db, snapshot):
        db.execute(models.organization_services.delete())
        return real(db, snapshot)
    monkeypatch.setattr(migration, "_verify_import", altered_copy)
    with pytest.raises(migration.MigrationError, match="destination_content_mismatch_organization_services"):
        migration.migrate(legacy_source(), pg_engine, apply=True)
    assert count(pg_engine) == 0


@pytest.mark.parametrize("empty", [False, True])
def test_deleted_identity_high_water_is_preserved_for_every_identity_table(legacy_source, pg_engine, empty):
    path = legacy_source(empty=empty)
    with sqlite3.connect(path) as db:
        # A row can have existed and been deleted, even when a table is now empty.
        db.execute("DELETE FROM sqlite_sequence")
        db.executemany("INSERT INTO sqlite_sequence(name,seq) VALUES (?,?)", [(name, 100 + index) for index, name in enumerate(migration.IDENTITY_TABLES)])
    result = migration.migrate(path, pg_engine, apply=True)
    assert result["status"] == "imported"
    with pg_engine.begin() as db:
        for index, name in enumerate(migration.IDENTITY_TABLES):
            assert db.execute(text("SELECT nextval(pg_get_serial_sequence(:table_name,'id'))"), {"table_name": name}).scalar_one() == 101 + index


def test_retained_id_is_used_when_higher_than_sqlite_sequence(legacy_source, pg_engine):
    path = legacy_source()
    change(path, "UPDATE sqlite_sequence SET seq=1 WHERE name='users'")
    assert migration.migrate(path, pg_engine, apply=True)["status"] == "imported"
    with pg_engine.begin() as db:
        assert db.execute(text("SELECT nextval(pg_get_serial_sequence('users','id'))")).scalar_one() == 43


@pytest.mark.parametrize(("statement", "value", "error"), [
    ("UPDATE sqlite_sequence SET seq=? WHERE name='users'", -1, "source_identity_sequence_invalid"),
    ("UPDATE sqlite_sequence SET seq=? WHERE name='users'", None, "source_identity_sequence_invalid"),
    ("UPDATE sqlite_sequence SET seq=? WHERE name='users'", "invalid", "source_identity_sequence_invalid"),
    ("UPDATE sqlite_sequence SET seq=? WHERE name='users'", 42.5, "source_identity_sequence_invalid"),
    ("UPDATE sqlite_sequence SET seq=? WHERE name='users'", 2**63 - 1, "source_identity_sequence_exhausted"),
    ("INSERT INTO sqlite_sequence(name,seq) VALUES ('users',?)", 100, "source_identity_sequence_invalid"),
    ("INSERT INTO sqlite_sequence(name,seq) VALUES ('unknown_table',?)", 100, "source_identity_sequence_invalid"),
])
def test_invalid_or_exhausted_legacy_sequence_blocks_before_copy(legacy_source, pg_engine, statement, value, error):
    path = legacy_source()
    change(path, statement, (value,))
    original = path.read_bytes()
    with pytest.raises(migration.MigrationError, match=error):
        migration.migrate(path, pg_engine, apply=True)
    assert count(pg_engine) == 0
    assert path.read_bytes() == original


def test_retained_maximum_bigint_blocks_before_copy(legacy_source, pg_engine):
    path = legacy_source()
    change(path, "UPDATE announcements SET id=?", (2**63 - 1,))
    # A lower legacy sequence cannot make an exhausted retained ID safe to resume.
    change(path, "UPDATE sqlite_sequence SET seq=1 WHERE name='announcements'")
    with pytest.raises(migration.MigrationError, match="source_identity_sequence_exhausted"):
        migration.migrate(path, pg_engine, apply=True)
    assert count(pg_engine) == 0


@pytest.mark.parametrize("suffix", ["", "-wal", "-shm", "-journal"])
def test_cli_report_hardlink_cannot_overwrite_source_or_auxiliary_file(legacy_source, tmp_path, suffix):
    source = legacy_source()
    protected = Path(str(source) + suffix)
    if suffix:
        protected.write_bytes(b"synthetic-auxiliary-content")
    original = protected.read_bytes()
    report_path = tmp_path / "linked-report.json"
    os.link(protected, report_path)
    assert report_path.resolve() != protected.resolve()
    with pytest.raises(SystemExit) as failure:
        migration.main(["--source", str(source), "--report", str(report_path), "--apply"])
    assert failure.value.code == 2
    assert protected.read_bytes() == original


def test_cli_report_failure_preserves_committed_import_status(legacy_source, tmp_path, pg_engine, monkeypatch, capsys):
    source = legacy_source()
    original = source.read_bytes()
    report_path = tmp_path / "unwritable-report.json"
    real_write = Path.write_text
    def fail_report_write(path, *args, **kwargs):
        if path == report_path:
            raise PermissionError("synthetic report failure")
        return real_write(path, *args, **kwargs)
    monkeypatch.setattr(Path, "write_text", fail_report_write)
    code = migration.main(["--source", str(source), "--report", str(report_path), "--apply"])
    result = json.loads(capsys.readouterr().out)
    assert code == 3
    assert result["status"] == "imported"
    assert result["report_error"] == "report_write_failed"
    assert result["verified"]["users"]["count"] == 1
    assert count(pg_engine) == 1
    assert source.read_bytes() == original
    assert not report_path.exists()


def test_source_without_autoincrement_sequence_table_is_rejected(tmp_path):
    path = tmp_path / "without-autoincrement.sqlite"
    ddl = (Path(__file__).parent / "fixtures/legacy_schema.sql").read_text(encoding="utf-8").replace("AUTOINCREMENT", "")
    with sqlite3.connect(path) as db:
        db.executescript(ddl)
    with pytest.raises(migration.MigrationError, match="source_identity_sequence_missing"):
        migration.read_snapshot(path)


def test_unknown_table_with_sqlite_like_prefix_cannot_be_silently_ignored(legacy_source):
    path = legacy_source()
    change(path, "CREATE TABLE sqliteArchive (id INTEGER)")
    with pytest.raises(migration.MigrationError, match="unsupported_source_tables"):
        migration.read_snapshot(path)


@pytest.mark.parametrize(("table", "column"), [
    ("users", "full_name"), ("users", "username"), ("users", "email"),
    ("announcements", "title"), ("organizations", "name"),
])
def test_null_byte_in_legacy_text_is_reported_before_copy(legacy_source, pg_engine, table, column):
    source = legacy_source()
    value = "synthetic-sensitive-null\x00content@example.org"
    change(source, f"UPDATE {table} SET {column}=?", (value,))
    result = migration.migrate(source, pg_engine, apply=True)
    assert result["status"] == "blocked"
    assert {"table": table, "row": 1, "code": "invalid_text_null_byte", "column": column} in result["problems"]
    assert value not in json.dumps(result)
    assert "synthetic-sensitive-null" not in json.dumps(result)
    assert count(pg_engine) == 0


def test_timestamp_with_more_than_microsecond_precision_is_not_silently_truncated(legacy_source, pg_engine):
    source = legacy_source()
    change(source, "UPDATE users SET created_at='2026-10-17 06:00:00.1234567'")
    result = migration.migrate(source, pg_engine, apply=True)
    assert result["status"] == "blocked"
    assert {"table": "users", "row": 1, "code": "invalid_timestamp", "column": "created_at"} in result["problems"]
    assert count(pg_engine) == 0


@pytest.mark.parametrize(("value", "expected"), [
    ("2026-10-17T06:00:00.123456Z", "2026-10-17T06:00:00.123456+00:00"),
    ("2026-10-17T08:30:00.123456+02:30", "2026-10-17T06:00:00.123456+00:00"),
])
def test_timestamp_microseconds_and_timezone_offset_are_preserved(legacy_source, pg_engine, value, expected):
    source = legacy_source()
    change(source, "UPDATE users SET created_at=?", (value,))
    result = migration.migrate(source, pg_engine, apply=True)
    assert result["status"] == "imported"
    with pg_engine.connect() as db:
        actual = db.execute(select(models.users.c.created_at)).scalar_one()
    assert actual.isoformat() == expected


def test_cli_report_cannot_overwrite_rollback_journal_path(legacy_source):
    source = legacy_source()
    original_source = source.read_bytes()
    journal = Path(str(source) + "-journal")
    original_journal = b"synthetic-rollback-journal"
    journal.write_bytes(original_journal)
    with pytest.raises(SystemExit) as failure:
        migration.main(["--source", str(source), "--report", str(journal), "--apply"])
    assert failure.value.code == 2
    assert source.read_bytes() == original_source
    assert journal.read_bytes() == original_journal
