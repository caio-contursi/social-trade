"""PostgreSQL connections. Schema changes are applied explicitly with Alembic."""
from contextlib import contextmanager

from sqlalchemy import create_engine

from app.config import DATABASE_SCHEMA, DATABASE_URL


options = "-ctimezone=UTC"
if DATABASE_SCHEMA:
    options += f" -csearch_path={DATABASE_SCHEMA}"
engine = create_engine(DATABASE_URL, connect_args={"options": options}, pool_pre_ping=True, hide_parameters=True)


def connect():
    return engine.connect()


@contextmanager
def transaction():
    with engine.begin() as connection:
        yield connection
