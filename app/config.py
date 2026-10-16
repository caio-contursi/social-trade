import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
DATABASE_PATH = Path(os.getenv("SOCIALTRADE_DB", str(BASE_DIR / "socialtrade.db")))
TOKEN_SECRET = os.getenv("SOCIALTRADE_TOKEN_SECRET", "development-secret-change-before-deploy")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
DEMO_USERS_ENABLED = os.getenv("SOCIALTRADE_DEMO_USERS", "true").lower() == "true"
