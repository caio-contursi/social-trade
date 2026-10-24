"""Alembic owns schema changes; application startup never runs migrations."""

from logging.config import fileConfig
import os
from pathlib import Path
import re
import sys

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import make_url

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.models import metadata  # noqa: E402


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)


def database_url():
    value = os.getenv("SOCIALTRADE_DATABASE_URL")
    if not value:
        raise RuntimeError("Defina SOCIALTRADE_DATABASE_URL para executar as migrações.")
    url = make_url(value)
    if url.get_backend_name() != "postgresql":
        raise RuntimeError("As migrações do SocialTrade exigem PostgreSQL.")
    if url.drivername == "postgresql":
        url = url.set(drivername="postgresql+psycopg")
    return url


def connect_args():
    schema = os.getenv("SOCIALTRADE_DATABASE_SCHEMA")
    if not schema:
        return {}
    if not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", schema):
        raise RuntimeError("SOCIALTRADE_DATABASE_SCHEMA deve ser um identificador PostgreSQL simples em minúsculas.")
    return {"options": f"-csearch_path={schema}"}


def run_connection(connection):
    context.configure(connection=connection, target_metadata=metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    existing = config.attributes.get("connection")
    if existing is not None:
        run_connection(existing)
        return
    engine = create_engine(database_url(), poolclass=pool.NullPool, connect_args=connect_args())
    try:
        with engine.connect() as connection:
            run_connection(connection)
    finally:
        engine.dispose()


if context.is_offline_mode():
    context.configure(url=database_url(), target_metadata=metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()
else:
    run_migrations_online()
