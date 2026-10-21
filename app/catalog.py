"""Read catalogs from their versioned database records, preserving the API shape."""

from sqlalchemy import select
from sqlalchemy.engine import Connection

from app.models import areas, organization_types, services


ROLE_LABELS = {"member": "Usuário", "volunteer": "Voluntário", "moderator": "Moderação"}


def load_catalog(connection: Connection) -> dict:
    return {
        "organization_types": [dict(row) for row in connection.execute(
            select(organization_types.c.code, organization_types.c.name.label("label")).order_by(organization_types.c.code),
        ).mappings()],
        "areas": [dict(row) for row in connection.execute(
            select(areas.c.code, areas.c.name.label("label")).order_by(areas.c.code),
        ).mappings()],
        "services": [dict(row) for row in connection.execute(
            select(services.c.code, services.c.name.label("label"), services.c.availability.label("status")).order_by(services.c.code),
        ).mappings()],
    }


def get_catalog_codes(connection: Connection) -> dict[str, set[str]]:
    return {
        "organization_types": set(connection.execute(select(organization_types.c.code)).scalars()),
        "areas": set(connection.execute(select(areas.c.code)).scalars()),
        "services": set(connection.execute(select(services.c.code)).scalars()),
    }
