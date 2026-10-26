"""Import the legacy SQLite snapshot without modifying or repairing its records.

The destination must already have been migrated by Alembic and contain no business
data. Reports contain counts, problem codes and row positions, never record values.
"""
from __future__ import annotations

import argparse
from collections import Counter
from contextlib import closing
import base64
import binascii
from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
from typing import Any

from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import CheckConstraint, create_engine, func, inspect, select, text
from dotenv import load_dotenv
from sqlalchemy.engine import Connection, Engine, make_url
from sqlalchemy.exc import SQLAlchemyError

from app.documents import valid_cnpj, valid_cpf
from app.models import metadata


TABLES = (
    "users", "organizations", "organization_areas", "organization_services",
    "project_memberships", "announcements", "support_tickets",
)
IDENTITY_TABLES = ("users", "organizations", "announcements", "support_tickets")
LEGACY_COLUMNS = {
    "users": "id full_name username email password_hash phone title role document account_type registration_number created_at".split(),
    "organizations": "id owner_id name slug organization_type institution_kind cnpj city state founding_year short_description objective impact_summary description website_url instagram_url pix_key logo_url created_at".split(),
    "organization_areas": "organization_id area_code".split(),
    "organization_services": "organization_id service_code interested".split(),
    "project_memberships": "user_id organization_id member_role created_at".split(),
    "announcements": "id title body category published_at".split(),
    "support_tickets": "id user_id subject message status created_at".split(),
}
DEMO_CPFS = {digit * 11 for digit in "1234"}
DEMO_DOMAINS = ("@socialtrade.local", "@impactledger.local")
STATES = set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split())


class MigrationError(RuntimeError):
    """A public error code with no connection secrets or record contents."""


@dataclass
class Snapshot:
    path: Path
    fingerprint: str
    rows: dict[str, list[dict[str, Any]]] = field(repr=False)
    identity_high_water: dict[str, int] = field(default_factory=dict, repr=False)
    problems: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[dict[str, Any]] = field(default_factory=list)


def fingerprint(path: Path) -> str:
    digest = hashlib.sha256()
    # WAL participates in the snapshot's change detection; it is never modified.
    for suffix in ("", "-wal"):
        item = Path(str(path) + suffix)
        digest.update(suffix.encode())
        if item.exists():
            with item.open("rb") as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(block)
    return digest.hexdigest()


def _issue(table: str, row: int, code: str, column: str | None = None) -> dict:
    result = {"table": table, "row": row, "code": code}
    if column:
        result["column"] = column
    return result


def _valid_cpf(value: str) -> bool:
    try:
        return valid_cpf(value) == value
    except (ValueError, TypeError, AttributeError):
        return False


def _valid_cnpj(value: str) -> bool:
    try:
        return valid_cnpj(value) == value
    except (ValueError, TypeError, AttributeError):
        return False


def _utc(value: Any) -> datetime:
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,6})?(?:Z|[+-][0-9]{2}:[0-9]{2})?", value):
        raise ValueError("invalid_timestamp")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def read_snapshot(source: str | Path, *, allow_demo_documents: bool = False) -> Snapshot:
    try:
        path = Path(source).resolve(strict=True)
        before = fingerprint(path)
    except (OSError, ValueError) as exc:
        raise MigrationError("source_not_readable") from exc
    snapshot = Snapshot(path, before, {})
    try:
        with closing(sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)) as db:
            db.row_factory = sqlite3.Row
            db.execute("PRAGMA query_only=ON")
            db.execute("BEGIN")
            existing = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*'")}
            if existing != set(TABLES):
                raise MigrationError("unsupported_source_tables")
            if [row[0] for row in db.execute("PRAGMA integrity_check")] != ["ok"]:
                raise MigrationError("source_integrity_error")
            if db.execute("PRAGMA foreign_key_check").fetchone():
                snapshot.problems.append(_issue("database", 0, "foreign_key_violation"))
            for name in TABLES:
                columns = {row[1] for row in db.execute(f'PRAGMA table_info("{name}")')}
                if columns != set(LEGACY_COLUMNS[name]):
                    raise MigrationError("unsupported_source_columns_" + name)
                pk = [row[1] for row in sorted(db.execute(f'PRAGMA table_info("{name}")'), key=lambda row: row[5]) if row[5]]
                order = ",".join(f'"{column}"' for column in pk)
                rows = [dict(row) for row in db.execute(f'SELECT * FROM "{name}" ORDER BY {order}')]
                if name == "users":
                    # A coluna é nova no PostgreSQL; registros legados não têm CPF de responsável.
                    for row in rows:
                        row["responsible_cpf"] = None
                if name == "organizations":
                    # Legacy profiles have no reviewed Pix-key fields. Never infer
                    # approval during import; every historical key starts unverified.
                    for row in rows:
                        row["pix_key_verified_at"] = None
                        row["pix_key_verified_by_user_id"] = None
                snapshot.rows[name] = rows
            _read_identity_high_water(db, snapshot)
    except sqlite3.Error as exc:
        raise MigrationError("source_read_error") from exc
    if fingerprint(path) != before:
        raise MigrationError("source_changed")
    _validate_source(snapshot, allow_demo_documents=allow_demo_documents)
    return snapshot


def _read_identity_high_water(db: sqlite3.Connection, snapshot: Snapshot) -> None:
    # AUTOINCREMENT remembers deleted IDs. Reusing one after the migration could
    # make an unexpired session for a deleted account identify a new account.
    if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'").fetchone():
        raise MigrationError("source_identity_sequence_missing")
    sequences: dict[str, int] = {}
    for name, value in db.execute("SELECT name, seq FROM sqlite_sequence"):
        if name not in IDENTITY_TABLES or name in sequences or not isinstance(value, int) or value < 0:
            raise MigrationError("source_identity_sequence_invalid")
        sequences[name] = value
    for name in IDENTITY_TABLES:
        retained = [row["id"] for row in snapshot.rows[name] if isinstance(row["id"], int)]
        high_water = max([0, sequences.get(name, 0)] + retained)
        if high_water >= 2**63 - 1:
            raise MigrationError("source_identity_sequence_exhausted")
        snapshot.identity_high_water[name] = high_water


def _validate_contracts(snapshot: Snapshot) -> None:
    limits = {
        "users": {"full_name": (2, 120), "username": (3, 30), "email": (3, 254), "phone": (0, 30), "title": (2, 80)},
        "organizations": {"name": (2, 160), "city": (2, 100), "state": (2, 2), "short_description": (10, 280), "objective": (0, 2000), "impact_summary": (0, 2000), "description": (0, 5000), "website_url": (0, 500), "instagram_url": (0, 500), "logo_url": (0, 500), "pix_key": (0, 160)},
        "announcements": {"title": (4, 160), "body": (10, 3000), "category": (1, 40)},
        "support_tickets": {"subject": (4, 140), "message": (10, 4000)},
    }
    numeric = {"id", "owner_id", "user_id", "organization_id", "founding_year", "interested"}
    dates = {"created_at", "published_at"}
    for name, rows in snapshot.rows.items():
        for position, row in enumerate(rows, 1):
            for column, value in row.items():
                if value is None or column in dates:
                    continue
                if column in numeric:
                    if not isinstance(value, int) or isinstance(value, bool) or not -(2**63) <= value < 2**63:
                        snapshot.problems.append(_issue(name, position, "invalid_integer", column))
                elif not isinstance(value, str):
                    snapshot.problems.append(_issue(name, position, "invalid_text_type", column))
                else:
                    if "\x00" in value:
                        snapshot.problems.append(_issue(name, position, "invalid_text_null_byte", column))
                    minimum, maximum = limits.get(name, {}).get(column, (0, None))
                    if len(value) < minimum or (maximum is not None and len(value) > maximum):
                        snapshot.problems.append(_issue(name, position, "invalid_text_length", column))
            if name == "users":
                email = row["email"]
                if not isinstance(email, str) or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
                    snapshot.problems.append(_issue(name, position, "invalid_email", "email"))
                try:
                    salt, digest = row["password_hash"].split("$")
                    salt = base64.b64decode(salt, altchars=b"-_", validate=True)
                    digest = base64.b64decode(digest, altchars=b"-_", validate=True)
                    if len(salt) != 16 or len(digest) != 64:
                        raise ValueError("invalid_hash")
                except (ValueError, AttributeError, TypeError, binascii.Error):
                    snapshot.problems.append(_issue(name, position, "invalid_password_hash", "password_hash"))
            if name == "organizations":
                for column in ("website_url", "instagram_url", "logo_url"):
                    value = row[column]
                    if value and (not isinstance(value, str) or not re.fullmatch(r"https?://[^\s]+", value, flags=re.I)):
                        snapshot.problems.append(_issue(name, position, "invalid_url", column))


def _validate_source(snapshot: Snapshot, *, allow_demo_documents: bool) -> None:
    _validate_contracts(snapshot)
    problems, warnings = snapshot.problems, snapshot.warnings
    required = {
        "users": "id full_name username email password_hash role document account_type created_at".split(),
        "organizations": "id owner_id name slug organization_type institution_kind city state short_description created_at".split(),
        "organization_areas": "organization_id area_code".split(),
        "organization_services": "organization_id service_code interested".split(),
        "project_memberships": "user_id organization_id member_role created_at".split(),
        "announcements": "id title body category published_at".split(),
        "support_tickets": "id user_id subject message status created_at".split(),
    }
    users_by_id = {row["id"]: row for row in snapshot.rows["users"]}
    orgs_by_id = {row["id"]: row for row in snapshot.rows["organizations"]}
    for name in TABLES:
        for position, row in enumerate(snapshot.rows[name], 1):
            for column in required[name]:
                if row[column] is None or (isinstance(row[column], str) and not row[column].strip()):
                    problems.append(_issue(name, position, "required_value_missing", column))
            date_column = "published_at" if name == "announcements" else "created_at"
            if date_column in row:
                try:
                    row[date_column] = _utc(row[date_column])
                except (ValueError, OverflowError):
                    problems.append(_issue(name, position, "invalid_timestamp", date_column))

    for position, user in enumerate(snapshot.rows["users"], 1):
        kind, doc = user["account_type"], user["document"]
        if kind not in {"person", "donor", "project"}:
            problems.append(_issue("users", position, "invalid_account_type", "account_type"))
        if user["role"] not in {"member", "volunteer", "moderator"}:
            problems.append(_issue("users", position, "invalid_role", "role"))
        if not isinstance(user["username"], str) or not re.fullmatch(r"[A-Za-z0-9_]{3,30}", user["username"]):
            problems.append(_issue("users", position, "invalid_username", "username"))
        if not isinstance(doc, str) or not re.fullmatch(r"[0-9]{11}|[A-Z0-9]{12}[0-9]{2}", doc):
            problems.append(_issue("users", position, "invalid_document_format", "document"))
        elif kind == "person":
            if not _valid_cpf(doc):
                demo = doc in DEMO_CPFS and str(user["email"]).lower().endswith(DEMO_DOMAINS)
                if demo and allow_demo_documents:
                    warnings.append(_issue("users", position, "explicit_demo_cpf_exception", "document"))
                else:
                    problems.append(_issue("users", position, "invalid_cpf", "document"))
        elif not _valid_cnpj(doc):
            problems.append(_issue("users", position, "invalid_cnpj", "document"))
        registration = user["registration_number"]
        if (kind == "person" and registration is None) or (registration is not None and (not isinstance(registration, str) or not re.fullmatch(r"[0-9]{6}", registration))):
            problems.append(_issue("users", position, "invalid_registration_number", "registration_number"))

    for position, org in enumerate(snapshot.rows["organizations"], 1):
        if org["owner_id"] not in users_by_id:
            problems.append(_issue("organizations", position, "missing_owner", "owner_id"))
        if org["institution_kind"] not in {"donor", "project"}:
            problems.append(_issue("organizations", position, "invalid_institution_kind", "institution_kind"))
        if org["institution_kind"] == "project" and org["organization_type"] == "company":
            problems.append(_issue("organizations", position, "company_cannot_be_project", "organization_type"))
        if org["state"] not in STATES:
            problems.append(_issue("organizations", position, "invalid_state", "state"))
        if org["founding_year"] is not None and (not isinstance(org["founding_year"], int) or not 1800 <= org["founding_year"] <= 2100):
            problems.append(_issue("organizations", position, "invalid_founding_year", "founding_year"))
        if org["cnpj"] is not None and (not isinstance(org["cnpj"], str) or not _valid_cnpj(org["cnpj"])):
            problems.append(_issue("organizations", position, "invalid_cnpj", "cnpj"))
        owner = users_by_id.get(org["owner_id"])
        if owner and owner["account_type"] in {"donor", "project"} and org["cnpj"] is not None and org["cnpj"] != owner["document"]:
            warnings.append(_issue("organizations", position, "profile_cnpj_differs_from_login", "cnpj"))

    for name in ("organization_areas", "organization_services", "project_memberships"):
        for position, row in enumerate(snapshot.rows[name], 1):
            org = orgs_by_id.get(row["organization_id"])
            if org is None:
                problems.append(_issue(name, position, "missing_organization", "organization_id"))
            if name == "organization_services":
                if row["interested"] != 1:
                    problems.append(_issue(name, position, "legacy_interest_requires_decision", "interested"))
                del row["interested"]
            if name == "project_memberships":
                if row["user_id"] not in users_by_id:
                    problems.append(_issue(name, position, "missing_user", "user_id"))
                if org and org["institution_kind"] != "project":
                    problems.append(_issue(name, position, "membership_requires_project", "organization_id"))
                if row["member_role"] not in {"staff", "assisted"}:
                    problems.append(_issue(name, position, "invalid_member_role", "member_role"))
                row["organization_kind"] = "project"
    for position, row in enumerate(snapshot.rows["support_tickets"], 1):
        if row["user_id"] not in users_by_id:
            problems.append(_issue("support_tickets", position, "missing_user", "user_id"))
        if row["status"] not in {"open", "in_progress", "resolved"}:
            problems.append(_issue("support_tickets", position, "invalid_ticket_status", "status"))


def destination_engine(url: str, schema: str | None = None) -> Engine:
    try:
        parsed = make_url(url)
    except Exception as exc:
        raise MigrationError("invalid_destination_url") from exc
    if parsed.drivername not in {"postgresql+psycopg", "postgresql"}:
        raise MigrationError("destination_must_be_postgresql")
    parsed = parsed.set(drivername="postgresql+psycopg")
    if schema and not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", schema):
        raise MigrationError("invalid_destination_schema")
    options = {"options": "-csearch_path=" + schema} if schema else {}
    return create_engine(parsed, connect_args=options, hide_parameters=True, pool_pre_ping=True)


def _validate_destination(db: Connection, snapshot: Snapshot) -> None:
    # Fail before copying: only Alembic-created, fully validated schemas are usable.
    available = set(db.execute(text("SELECT tablename FROM pg_tables WHERE schemaname=current_schema()" )).scalars())
    if not set(metadata.tables).issubset(available) or "alembic_version" not in available:
        raise MigrationError("destination_schema_not_migrated")
    root = Path(__file__).resolve().parents[1]
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "migrations"))
    expected_heads = set(ScriptDirectory.from_config(config).get_heads())
    if set(db.execute(text("SELECT version_num FROM alembic_version")).scalars()) != expected_heads:
        raise MigrationError("destination_revision_mismatch")
    if available != set(metadata.tables) | {"alembic_version"}:
        raise MigrationError("destination_structure_mismatch")
    context = MigrationContext.configure(db, opts={"compare_type": True, "compare_server_default": True})
    if compare_metadata(context, metadata):
        raise MigrationError("destination_structure_mismatch")
    inspector = inspect(db)
    for name, table in metadata.tables.items():
        expected_checks = {str(item.name) for item in table.constraints if isinstance(item, CheckConstraint)}
        actual_checks = {item["name"] for item in inspector.get_check_constraints(name)}
        if expected_checks != actual_checks:
            raise MigrationError("destination_check_constraints_mismatch")
    if db.execute(text("SELECT count(*) FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND NOT convalidated")).scalar_one():
        raise MigrationError("destination_constraints_not_validated")
    for name in (*TABLES, "donations"):
        if db.execute(select(func.count()).select_from(metadata.tables[name])).scalar_one():
            raise MigrationError("destination_not_empty")
    for table, column, catalog in (("organizations", "organization_type", "organization_types"), ("organization_areas", "area_code", "areas"), ("organization_services", "service_code", "services")):
        known = set(db.execute(select(metadata.tables[catalog].c.code)).scalars())
        for position, row in enumerate(snapshot.rows[table], 1):
            if row[column] not in known:
                snapshot.problems.append(_issue(table, position, "unknown_catalog_code", column))
    for field_name in ("email", "username"):
        seen: set[str] = set()
        for position, row in enumerate(snapshot.rows["users"], 1):
            value = row[field_name]
            if not isinstance(value, str) or "\x00" in value:
                continue
            lowered = db.execute(text("SELECT lower(:value)"), {"value": value}).scalar_one()
            if lowered in seen:
                snapshot.problems.append(_issue("users", position, "duplicate_case_insensitive", field_name))
            seen.add(lowered)
    for name, column in (("users", "document"), ("users", "registration_number"), ("organizations", "slug")):
        seen_values = Counter(row[column] for row in snapshot.rows[name] if row[column] is not None)
        if any(count > 1 for count in seen_values.values()):
            snapshot.problems.append(_issue(name, 0, "duplicate_unique_value", column))


def _canonical(row: dict[str, Any]) -> str:
    converted = {key: (value.astimezone(timezone.utc).isoformat() if isinstance(value, datetime) else value) for key, value in row.items()}
    return json.dumps(converted, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _checksum(rows: list[dict]) -> str:
    return hashlib.sha256("\n".join(sorted(_canonical(row) for row in rows)).encode("utf-8")).hexdigest()


def _verify_import(db: Connection, snapshot: Snapshot) -> dict:
    result = {}
    for name in TABLES:
        imported = [dict(row) for row in db.execute(select(metadata.tables[name])).mappings()]
        expected = snapshot.rows[name]
        if len(imported) != len(expected) or _checksum(imported) != _checksum(expected):
            raise MigrationError("destination_content_mismatch_" + name)
        result[name] = {"count": len(imported), "checksum": _checksum(imported)}
    return result


def _restart_identities(db: Connection, snapshot: Snapshot) -> None:
    quote = db.dialect.identifier_preparer.quote
    schema = quote(db.execute(text("SELECT current_schema()")).scalar_one())
    for name in IDENTITY_TABLES:
        next_id = snapshot.identity_high_water[name] + 1
        # ALTER identity RESTART participates in the transaction; setval does not.
        db.exec_driver_sql(f"ALTER TABLE {schema}.{quote(name)} ALTER COLUMN id RESTART WITH {next_id}")


def migrate(source: str | Path, engine: Engine, *, apply: bool = False, allow_demo_documents: bool = False) -> dict:
    snapshot = read_snapshot(source, allow_demo_documents=allow_demo_documents)
    report = {
        "mode": "apply" if apply else "check", "status": "blocked",
        "source_fingerprint": snapshot.fingerprint,
        "counts": {name: len(rows) for name, rows in snapshot.rows.items()},
        "problems": snapshot.problems, "warnings": snapshot.warnings,
        "source_unchanged": True,
    }
    try:
        with engine.begin() as db:
            if apply:
                quote = db.dialect.identifier_preparer.quote
                schema = db.execute(text("SELECT current_schema()")).scalar_one()
                if schema is None:
                    raise MigrationError("destination_schema_not_migrated")
                targets = ", ".join(f"{quote(schema)}.{quote(name)}" for name in (*TABLES, "donations"))
                db.exec_driver_sql(f"LOCK TABLE {targets} IN ACCESS EXCLUSIVE MODE")
            else:
                db.exec_driver_sql("SET TRANSACTION READ ONLY")
            _validate_destination(db, snapshot)
            if snapshot.problems:
                return report
            if fingerprint(snapshot.path) != snapshot.fingerprint:
                raise MigrationError("source_changed")
            if not apply:
                report["status"] = "ready"
                return report
            for name in TABLES:
                if snapshot.rows[name]:
                    db.execute(metadata.tables[name].insert(), snapshot.rows[name])
            report["verified"] = _verify_import(db, snapshot)
            if fingerprint(snapshot.path) != snapshot.fingerprint:
                raise MigrationError("source_changed")
            _restart_identities(db, snapshot)
        report["status"] = "imported"
        return report
    except SQLAlchemyError as exc:
        # Do not leak SQL parameters, password hashes or connection strings.
        raise MigrationError("destination_operation_failed") from exc


def main(argv: list[str] | None = None) -> int:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    parser = argparse.ArgumentParser(description="Validar/copiar o SQLite legado para um PostgreSQL vazio, sem alterar a origem.")
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--schema", default=os.getenv("SOCIALTRADE_DATABASE_SCHEMA"))
    parser.add_argument("--report", type=Path)
    parser.add_argument("--apply", action="store_true", help="Executar a cópia; sem esta opção, somente conferir.")
    parser.add_argument("--allow-demo-documents", action="store_true", help="Aceitar somente os quatro CPFs fictícios conhecidos em contas dos domínios de demonstração.")
    args = parser.parse_args(argv)
    if args.report:
        source = args.source.resolve()
        protected = (source, Path(str(source) + "-wal"), Path(str(source) + "-shm"), Path(str(source) + "-journal"))
        if args.report.resolve() in protected or (args.report.exists() and any(item.exists() and args.report.samefile(item) for item in protected)):
            parser.error("O relatório não pode substituir o banco de origem ou seus arquivos auxiliares.")
    engine = None
    try:
        url = os.environ.get("SOCIALTRADE_DATABASE_URL")
        if not url:
            raise MigrationError("destination_url_required")
        engine = destination_engine(url, args.schema)
        report = migrate(args.source, engine, apply=args.apply, allow_demo_documents=args.allow_demo_documents)
        code = 0 if report["status"] in {"ready", "imported"} else 2
    except MigrationError as exc:
        report, code = {"status": "blocked", "error": str(exc)}, 2
    except OSError:
        report, code = {"status": "blocked", "error": "filesystem_operation_failed"}, 2
    finally:
        if engine:
            engine.dispose()
    payload = json.dumps(report, ensure_ascii=False, indent=2)
    if args.report:
        try:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(payload + "\n", encoding="utf-8")
        except OSError:
            # The database transaction may already be committed. Keep its actual
            # status visible so a reporting failure never suggests a safe retry.
            report["report_error"] = "report_write_failed"
            payload = json.dumps(report, ensure_ascii=False, indent=2)
            code = 3
    print(payload)
    return code


if __name__ == "__main__":
    sys.exit(main())
