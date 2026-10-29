import os
import re
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.engine import make_url

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
DATABASE_URL = os.getenv("SOCIALTRADE_DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("Configure SOCIALTRADE_DATABASE_URL para um banco PostgreSQL migrado com Alembic.")
if make_url(DATABASE_URL).drivername != "postgresql+psycopg":
    raise RuntimeError("SOCIALTRADE_DATABASE_URL deve usar postgresql+psycopg://.")
DATABASE_SCHEMA = os.getenv("SOCIALTRADE_DATABASE_SCHEMA")
if DATABASE_SCHEMA and not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", DATABASE_SCHEMA):
    raise RuntimeError("SOCIALTRADE_DATABASE_SCHEMA deve ser um identificador PostgreSQL simples.")
TOKEN_SECRET = os.getenv("SOCIALTRADE_TOKEN_SECRET", "development-secret-change-before-deploy")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
DEMO_USERS_ENABLED = os.getenv("SOCIALTRADE_DEMO_USERS", "false").lower() == "true"
SOLANA_RPC_URL = os.getenv("SOCIALTRADE_SOLANA_RPC_URL", "https://api.mainnet.solana.com")
SOLANA_WALLET_ADDRESS = os.getenv(
    "SOCIALTRADE_SOLANA_WALLET_ADDRESS",
    "4BwSYD8V8KffnCBYYdP4rRXiaRn55UMpUPMbgUzbVRry",
).strip()
