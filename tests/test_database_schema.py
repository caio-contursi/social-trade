"""Exercise PostgreSQL guarantees directly, independently of API validation."""

from datetime import timedelta
from itertools import count
from pathlib import Path
from uuid import uuid4

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
import pytest
import sqlalchemy as sa
from sqlalchemy.exc import IntegrityError

from app.catalog import get_catalog_codes, load_catalog
from app.models import (
    announcements, areas, metadata, organization_areas, organization_services,
    organizations, organization_types, project_memberships, services, support_tickets, users,
)


_serial = count(1)


def insert_user(connection, **changes):
    """Synthetic documents test shape only; DV validation belongs to the API."""
    serial = next(_serial)
    kind = changes.get("account_type", "person")
    values = {
        "full_name": "Conta estrutural de teste", "username": f"schema_{serial}",
        "email": f"schema_{serial}@example.test", "password_hash": "synthetic-hash-not-a-login",
        "document": f"{90000000000 + serial:011d}" if kind == "person" else f"{90000000000000 + serial:014d}",
        "account_type": kind, "registration_number": f"{serial:06d}" if kind == "person" else None,
    }
    values.update(changes)
    return connection.execute(users.insert().values(**values).returning(users.c.id)).scalar_one()


def insert_organization(connection, owner_id, **changes):
    values = {
        "owner_id": owner_id, "name": "Perfil estrutural de teste", "slug": "schema-" + uuid4().hex,
        "organization_type": "association", "institution_kind": "project",
        "city": "Cidade de teste", "state": "RJ", "short_description": "Perfil usado apenas em testes.",
    }
    values.update(changes)
    return connection.execute(organizations.insert().values(**values).returning(organizations.c.id)).scalar_one()


def reject(connection, statement):
    """A failing constraint must leave the surrounding test transaction usable."""
    with pytest.raises(IntegrityError), connection.begin_nested():
        connection.execute(statement)


def test_migrated_schema_matches_metadata_and_reupgrade_keeps_catalogs(db_connection):
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.attributes["connection"] = db_connection
    before = load_catalog(db_connection)
    command.upgrade(config, "head")
    assert load_catalog(db_connection) == before
    assert [len(before[key]) for key in ("organization_types", "areas", "services")] == [7, 12, 9]
    assert compare_metadata(MigrationContext.configure(db_connection), metadata) == []
    assert set(sa.inspect(db_connection).get_table_names()) - {"alembic_version"} == set(metadata.tables)


def test_catalog_labels_availability_and_codes_come_from_database(db_connection):
    db_connection.execute(areas.update().where(areas.c.code == "education").values(name="Nome alterado no banco"))
    db_connection.execute(services.update().where(services.c.code == "public_profile").values(availability="future"))
    db_connection.execute(areas.insert().values(code="schema_only", name="Nova causa de teste"))
    catalog = load_catalog(db_connection)
    assert next(row for row in catalog["areas"] if row["code"] == "education")["label"] == "Nome alterado no banco"
    assert next(row for row in catalog["services"] if row["code"] == "public_profile")["status"] == "future"
    assert "schema_only" in get_catalog_codes(db_connection)["areas"]
    assert all(set(row) == {"code", "label"} for row in catalog["organization_types"])
    assert all(set(row) == {"code", "label", "status"} for row in catalog["services"])


def test_initial_revision_can_be_removed_and_reapplied(db_connection):
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.attributes["connection"] = db_connection
    command.downgrade(config, "base")
    assert set(sa.inspect(db_connection).get_table_names()) <= {"alembic_version"}
    command.upgrade(config, "head")
    assert set(sa.inspect(db_connection).get_table_names()) - {"alembic_version"} == set(metadata.tables)
    assert [len(rows) for rows in load_catalog(db_connection).values()] == [7, 12, 9]


@pytest.mark.parametrize("field,value", [("email", "Case@Example.Test"), ("username", "Stored_Case")])
def test_account_uniqueness_ignores_case(db_connection, field, value):
    insert_user(db_connection, **{field: value})
    with pytest.raises(IntegrityError), db_connection.begin_nested():
        insert_user(db_connection, **{field: value.swapcase()})


@pytest.mark.parametrize("field,value", [("document", "52998224725"), ("registration_number", "000007")])
def test_documents_and_matriculas_are_globally_unique(db_connection, field, value):
    insert_user(db_connection, **{field: value})
    with pytest.raises(IntegrityError), db_connection.begin_nested():
        insert_user(db_connection, **{field: value})


@pytest.mark.parametrize("changes", [
    {"document": None}, {"username": None},
    {"document": "1234567890"}, {"document": "12ABC34501DE35"},
    {"registration_number": None}, {"registration_number": "12345"}, {"registration_number": "00000X"},
    {"role": "admin"}, {"account_type": "other"},
    {"account_type": "donor", "document": "52998224725"},
    {"account_type": "project", "document": "12abc34501DE35"},
])
def test_invalid_identity_and_controlled_values_are_rejected_by_database(db_connection, changes):
    with pytest.raises(IntegrityError), db_connection.begin_nested():
        insert_user(db_connection, **changes)


def test_institutional_documents_accept_letters_and_null_matriculas(db_connection):
    first = insert_user(db_connection, account_type="donor", document="12ABC34501DE35")
    second = insert_user(db_connection, account_type="project", document="00000000E08G12")
    rows = db_connection.execute(sa.select(users.c.id, users.c.document, users.c.registration_number).where(users.c.id.in_([first, second]))).mappings().all()
    assert {row["document"] for row in rows} == {"12ABC34501DE35", "00000000E08G12"}
    assert all(row["registration_number"] is None for row in rows)


def test_legacy_person_owner_multiple_profiles_and_repeated_profile_cnpj_remain_supported(db_connection):
    owner = insert_user(db_connection)
    identifiers = [insert_organization(db_connection, owner, cnpj="12ABC34501DE35") for _ in range(2)]
    rows = db_connection.execute(sa.select(organizations).where(organizations.c.id.in_(identifiers))).mappings().all()
    assert len(rows) == 2
    assert all(row["owner_id"] == owner and row["cnpj"] == "12ABC34501DE35" for row in rows)
    assert all(row["objective"] is None and row["impact_summary"] is None for row in rows)


def test_donor_can_be_company_or_association(db_connection):
    owner = insert_user(db_connection, account_type="donor")
    for organization_type in ("company", "association"):
        identifier = insert_organization(db_connection, owner, institution_kind="donor", organization_type=organization_type)
        assert db_connection.execute(sa.select(organizations.c.organization_type).where(organizations.c.id == identifier)).scalar_one() == organization_type


@pytest.mark.parametrize("changes", [
    {"organization_type": "unknown"}, {"organization_type": "company"},
    {"institution_kind": "unknown"}, {"state": "XX"}, {"state": "rj"},
    {"founding_year": 1799}, {"founding_year": 2101}, {"cnpj": "12abc34501DE35"},
])
def test_profile_constraints_reject_invalid_values_without_api(db_connection, changes):
    owner = insert_user(db_connection)
    with pytest.raises(IntegrityError), db_connection.begin_nested():
        insert_organization(db_connection, owner, **changes)


def test_catalog_foreign_keys_reject_unknown_codes_and_protect_referenced_codes(db_connection):
    organization = insert_organization(db_connection, insert_user(db_connection))
    for table, key in ((organization_areas, "area_code"), (organization_services, "service_code")):
        reject(db_connection, table.insert().values(organization_id=organization, **{key: "unknown"}))
    db_connection.execute(organization_areas.insert().values(organization_id=organization, area_code="education"))
    db_connection.execute(organization_services.insert().values(organization_id=organization, service_code="public_profile"))
    reject(db_connection, areas.delete().where(areas.c.code == "education"))
    reject(db_connection, services.delete().where(services.c.code == "public_profile"))
    reject(db_connection, organization_types.delete().where(organization_types.c.code == "association"))
    reject(db_connection, services.update().where(services.c.code == "public_profile").values(availability="unknown"))


@pytest.mark.parametrize("table,code_field,code", [
    (organization_areas, "area_code", "education"),
    (organization_services, "service_code", "public_profile"),
])
def test_relationship_keys_reject_duplicates_and_orphan_organizations(db_connection, table, code_field, code):
    organization = insert_organization(db_connection, insert_user(db_connection))
    values = {"organization_id": organization, code_field: code}
    db_connection.execute(table.insert().values(**values))
    reject(db_connection, table.insert().values(**values))
    reject(db_connection, table.insert().values(organization_id=-1, **{code_field: code}))


def test_missing_owners_and_members_are_rejected_by_database(db_connection):
    with pytest.raises(IntegrityError), db_connection.begin_nested():
        insert_organization(db_connection, -1)
    project = insert_organization(db_connection, insert_user(db_connection))
    reject(db_connection, project_memberships.insert().values(user_id=-1, organization_id=project, member_role="staff"))


def test_membership_foreign_key_accepts_projects_and_rejects_donors_and_kind_changes(db_connection):
    member = insert_user(db_connection)
    owner = insert_user(db_connection, account_type="project")
    project = insert_organization(db_connection, owner)
    donor = insert_organization(db_connection, owner, institution_kind="donor")
    reject(db_connection, project_memberships.insert().values(user_id=member, organization_id=donor, member_role="staff"))
    reject(db_connection, project_memberships.insert().values(user_id=member, organization_id=donor, organization_kind="donor", member_role="staff"))
    reject(db_connection, project_memberships.insert().values(user_id=member, organization_id=project, member_role="owner"))
    db_connection.execute(project_memberships.insert().values(user_id=member, organization_id=project, member_role="staff"))
    reject(db_connection, organizations.update().where(organizations.c.id == project).values(institution_kind="donor"))
    reject(db_connection, project_memberships.insert().values(user_id=member, organization_id=project, member_role="assisted"))
    second = insert_organization(db_connection, owner)
    db_connection.execute(project_memberships.insert().values(user_id=member, organization_id=second, member_role="assisted"))
    assert db_connection.execute(sa.select(sa.func.count()).select_from(project_memberships).where(project_memberships.c.user_id == member)).scalar_one() == 2


def test_deleting_owner_or_ticket_author_cannot_erase_entities(db_connection):
    owner = insert_user(db_connection)
    organization = insert_organization(db_connection, owner)
    reject(db_connection, users.delete().where(users.c.id == owner))
    author = insert_user(db_connection)
    ticket = db_connection.execute(support_tickets.insert().values(user_id=author, subject="Ajuda de teste", message="Mensagem de teste").returning(support_tickets.c.id)).scalar_one()
    reject(db_connection, users.delete().where(users.c.id == author))
    assert db_connection.execute(sa.select(organizations.c.id).where(organizations.c.id == organization)).scalar_one() == organization
    assert db_connection.execute(sa.select(support_tickets.c.status).where(support_tickets.c.id == ticket)).scalar_one() == "open"
    reject(db_connection, support_tickets.update().where(support_tickets.c.id == ticket).values(status="deleted"))


def test_ticket_protocol_constraints_and_default(db_connection):
    owner = insert_user(db_connection)
    values = {"user_id": owner, "subject": "Ticket de teste", "message": "Relato fictício para teste."}
    db_connection.execute(support_tickets.insert().values(**values, protocol="000007"))
    for protocol in ["000007", "12345", "12a456", None]:
        reject(db_connection, support_tickets.insert().values(**values, protocol=protocol))
    db_connection.execute(support_tickets.delete().where(support_tickets.c.protocol == "000007"))
    generated = db_connection.execute(support_tickets.insert().values(**values).returning(support_tickets.c.protocol)).scalar_one()
    assert len(generated) == 6 and generated.isascii() and generated.isdigit()


def test_ticket_protocol_migration_backfills_existing_open_and_resolved_tickets(db_connection):
    import re
    owner = insert_user(db_connection)
    for index, state in enumerate(["open", "resolved"]):
        db_connection.execute(support_tickets.insert().values(user_id=owner, protocol=f"{index:06d}", subject=f"Ticket {state}", message="Relato mantido após migração.", status=state))
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.attributes["connection"] = db_connection
    command.downgrade(config, "20261028_0005")
    before = list(db_connection.execute(sa.text("SELECT id, subject, message, status FROM support_tickets ORDER BY id")))
    command.upgrade(config, "head")
    after = list(db_connection.execute(sa.select(support_tickets).order_by(support_tickets.c.id)).mappings())
    assert [(row["id"], row["subject"], row["message"], row["status"]) for row in after] == [tuple(row) for row in before]
    codes = [row["protocol"] for row in after]
    assert len(set(codes)) == 2 and all(re.fullmatch(r"[0-9]{6}", code) for code in codes)
    command.upgrade(config, "head")
    assert list(db_connection.execute(sa.select(support_tickets.c.protocol).order_by(support_tickets.c.id)).scalars()) == codes


def test_only_dependent_relationships_cascade_when_parent_is_deleted(db_connection):
    owner, member = insert_user(db_connection), insert_user(db_connection)
    project = insert_organization(db_connection, owner)
    db_connection.execute(organization_areas.insert().values(organization_id=project, area_code="education"))
    db_connection.execute(organization_services.insert().values(organization_id=project, service_code="public_profile"))
    db_connection.execute(project_memberships.insert().values(user_id=member, organization_id=project, member_role="assisted"))
    db_connection.execute(organizations.delete().where(organizations.c.id == project))
    for table in (organization_areas, organization_services, project_memberships):
        assert db_connection.execute(sa.select(sa.func.count()).select_from(table).where(table.c.organization_id == project)).scalar_one() == 0
    assert db_connection.execute(sa.select(users.c.id).where(users.c.id == owner)).scalar_one() == owner
    assert db_connection.execute(sa.select(areas.c.code).where(areas.c.code == "education")).scalar_one() == "education"


def test_generated_ids_timestamps_and_matricula_zeros_are_preserved(db_connection):
    identifier = insert_user(db_connection, registration_number="000003")
    row = db_connection.execute(sa.select(users).where(users.c.id == identifier)).mappings().one()
    assert isinstance(row["id"], int) and row["id"] > 0
    assert row["registration_number"] == "000003"
    assert row["created_at"].tzinfo is not None
    assert row["created_at"].utcoffset() is not None
    announced = db_connection.execute(announcements.insert().values(title="Aviso estrutural", body="Conteudo de teste").returning(announcements.c.published_at)).scalar_one()
    assert abs((announced - row["created_at"]).total_seconds()) < timedelta(minutes=1).total_seconds()
