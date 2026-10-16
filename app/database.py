import sqlite3
import re
from contextlib import contextmanager

from app.config import DATABASE_PATH


def connect():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DATABASE_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


@contextmanager
def transaction():
    db = connect()
    try:
        db.execute("BEGIN IMMEDIATE")
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def initialize():
    with transaction() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                username TEXT COLLATE NOCASE,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                phone TEXT,
                title TEXT,
                role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','volunteer','moderator')),
                document TEXT,
                account_type TEXT NOT NULL DEFAULT 'person' CHECK(account_type IN ('person','donor','project')),
                registration_number TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS organizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                organization_type TEXT NOT NULL,
                institution_kind TEXT NOT NULL DEFAULT 'project' CHECK(institution_kind IN ('donor','project')),
                cnpj TEXT,
                city TEXT NOT NULL,
                state TEXT NOT NULL,
                founding_year INTEGER,
                short_description TEXT NOT NULL,
                objective TEXT,
                impact_summary TEXT,
                description TEXT,
                website_url TEXT,
                instagram_url TEXT,
                pix_key TEXT,
                logo_url TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS organization_areas (
                organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                area_code TEXT NOT NULL,
                PRIMARY KEY (organization_id, area_code)
            );
            CREATE TABLE IF NOT EXISTS organization_services (
                organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                service_code TEXT NOT NULL,
                interested INTEGER NOT NULL DEFAULT 1,
                PRIMARY KEY (organization_id, service_code)
            );
            CREATE TABLE IF NOT EXISTS announcements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'plataforma',
                published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS support_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved')),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)
        columns = {row["name"] for row in db.execute("PRAGMA table_info(users)")}
        if "username" not in columns:
            db.execute("ALTER TABLE users ADD COLUMN username TEXT COLLATE NOCASE")
        for column, declaration in (("document", "TEXT"), ("account_type", "TEXT NOT NULL DEFAULT 'person'"), ("registration_number", "TEXT")):
            if column not in columns:
                db.execute(f"ALTER TABLE users ADD COLUMN {column} {declaration}")
        org_columns = {row["name"] for row in db.execute("PRAGMA table_info(organizations)")}
        for column, declaration in (("institution_kind", "TEXT NOT NULL DEFAULT 'project'"), ("objective", "TEXT"), ("impact_summary", "TEXT")):
            if column not in org_columns:
                db.execute(f"ALTER TABLE organizations ADD COLUMN {column} {declaration}")
        used_usernames: set[str] = set()
        for user in db.execute("SELECT id,email,username FROM users ORDER BY id").fetchall():
            username = (user["username"] or "").strip().lower()
            if not username or username in used_usernames:
                base = re.sub(r"[^a-z0-9_]+", "_", user["email"].split("@", 1)[0].lower()).strip("_")[:24]
                base = base or f"user{user['id']}"
                username = base
                suffix = 2
                while username in used_usernames:
                    tail = f"_{suffix}"
                    username = f"{base[:30-len(tail)]}{tail}"
                    suffix += 1
                db.execute("UPDATE users SET username=? WHERE id=?", (username, user["id"]))
            used_usernames.add(username)
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE)")
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_document ON users(document) WHERE document IS NOT NULL")
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_registration_number ON users(registration_number) WHERE registration_number IS NOT NULL")
        db.execute("CREATE TABLE IF NOT EXISTS project_memberships (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, member_role TEXT NOT NULL CHECK(member_role IN ('staff','assisted')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id, organization_id))")
        if db.execute("SELECT COUNT(*) FROM announcements").fetchone()[0] == 0:
            db.executemany(
                "INSERT INTO announcements (title, body, category) VALUES (?, ?, ?)",
                [
                    ("Bem-vindo ao SocialTrade", "Acesse avisos e mantenha seu perfil atualizado.", "novidade"),
                    ("Complete seu perfil", "Adicione uma organização e suas áreas de atuação.", "dica"),
                    ("Atualizações da plataforma", "Novas funcionalidades e informações do sistema.", "plataforma"),
                ],
            )
