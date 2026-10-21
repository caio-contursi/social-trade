-- Legacy SQLite schema only. No user records or credentials.

PRAGMA foreign_keys = ON;

CREATE TABLE announcements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'plataforma',
                published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

CREATE TABLE organization_areas (
                organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                area_code TEXT NOT NULL,
                PRIMARY KEY (organization_id, area_code)
            );

CREATE TABLE organization_services (
                organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                service_code TEXT NOT NULL,
                interested INTEGER NOT NULL DEFAULT 1,
                PRIMARY KEY (organization_id, service_code)
            );

CREATE TABLE organizations (
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

CREATE TABLE project_memberships (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, member_role TEXT NOT NULL CHECK(member_role IN ('staff','assisted')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id, organization_id));

CREATE TABLE support_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved')),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

CREATE TABLE users (
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

CREATE UNIQUE INDEX idx_users_registration_number ON users(registration_number) WHERE registration_number IS NOT NULL;

CREATE UNIQUE INDEX idx_users_document ON users(document) WHERE document IS NOT NULL;

CREATE UNIQUE INDEX idx_users_username ON users(username COLLATE NOCASE);
