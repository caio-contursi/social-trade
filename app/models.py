"""PostgreSQL schema; importing this module never connects or changes data."""

import sqlalchemy as sa


metadata = sa.MetaData(naming_convention={
    "pk": "pk_%(table_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
})


def identity_column():
    return sa.Column("id", sa.BigInteger, sa.Identity(always=False), primary_key=True)


def timestamp_column(name="created_at"):
    return sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())


users = sa.Table(
    "users", metadata,
    identity_column(),
    sa.Column("full_name", sa.Text, nullable=False),
    sa.Column("username", sa.Text, nullable=False),
    sa.Column("email", sa.Text, nullable=False),
    sa.Column("password_hash", sa.Text, nullable=False),
    sa.Column("phone", sa.Text),
    sa.Column("title", sa.Text),
    sa.Column("role", sa.Text, nullable=False, server_default="member"),
    sa.Column("document", sa.String(14), nullable=False, unique=True),
    sa.Column("account_type", sa.Text, nullable=False, server_default="person"),
    sa.Column("registration_number", sa.String(6), unique=True),
    timestamp_column(),
    sa.CheckConstraint("role IN ('member','volunteer','moderator')", name="role"),
    sa.CheckConstraint("account_type IN ('person','donor','project')", name="account_type"),
    sa.CheckConstraint(
        "(account_type = 'person' AND document ~ '^[0-9]{11}$' AND registration_number IS NOT NULL) "
        "OR (account_type IN ('donor','project') AND document ~ '^[A-Z0-9]{12}[0-9]{2}$')",
        name="document_account_type",
    ),
    sa.CheckConstraint("registration_number IS NULL OR registration_number ~ '^[0-9]{6}$'", name="registration_number"),
)
sa.Index("ix_users_email_lower", sa.func.lower(users.c.email), unique=True)
sa.Index("ix_users_username_lower", sa.func.lower(users.c.username), unique=True)

organization_types = sa.Table(
    "organization_types", metadata,
    sa.Column("code", sa.Text, primary_key=True),
    sa.Column("name", sa.Text, nullable=False),
)
areas = sa.Table(
    "areas", metadata,
    sa.Column("code", sa.Text, primary_key=True),
    sa.Column("name", sa.Text, nullable=False),
)
services = sa.Table(
    "services", metadata,
    sa.Column("code", sa.Text, primary_key=True),
    sa.Column("name", sa.Text, nullable=False),
    sa.Column("availability", sa.Text, nullable=False),
    sa.CheckConstraint("availability IN ('available','coming_soon','future')", name="availability"),
)

organizations = sa.Table(
    "organizations", metadata,
    identity_column(),
    sa.Column("owner_id", sa.BigInteger, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
    sa.Column("name", sa.Text, nullable=False),
    sa.Column("slug", sa.Text, nullable=False, unique=True),
    sa.Column("organization_type", sa.Text, sa.ForeignKey("organization_types.code", ondelete="RESTRICT"), nullable=False),
    sa.Column("institution_kind", sa.Text, nullable=False, server_default="project"),
    sa.Column("cnpj", sa.String(14)),
    sa.Column("city", sa.Text, nullable=False),
    sa.Column("state", sa.String(2), nullable=False),
    sa.Column("founding_year", sa.SmallInteger),
    sa.Column("short_description", sa.Text, nullable=False),
    sa.Column("objective", sa.Text),
    sa.Column("impact_summary", sa.Text),
    sa.Column("description", sa.Text),
    sa.Column("website_url", sa.Text),
    sa.Column("instagram_url", sa.Text),
    sa.Column("pix_key", sa.Text),
    sa.Column("pix_key_verified_at", sa.DateTime(timezone=True)),
    sa.Column("pix_key_verified_by_user_id", sa.BigInteger, sa.ForeignKey("users.id", ondelete="RESTRICT")),
    sa.Column("logo_url", sa.Text),
    timestamp_column(),
    sa.UniqueConstraint("id", "institution_kind", name="uq_organizations_id_institution_kind"),
    sa.CheckConstraint("institution_kind IN ('donor','project')", name="institution_kind"),
    sa.CheckConstraint("institution_kind = 'donor' OR organization_type <> 'company'", name="company_is_donor"),
    sa.CheckConstraint("cnpj IS NULL OR cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$'", name="cnpj"),
    sa.CheckConstraint(
        "(pix_key_verified_at IS NULL AND pix_key_verified_by_user_id IS NULL) "
        "OR (pix_key IS NOT NULL AND pix_key_verified_at IS NOT NULL AND pix_key_verified_by_user_id IS NOT NULL AND cnpj IS NOT NULL)",
        name="pix_review_consistency",
    ),
    sa.CheckConstraint("state IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')", name="state"),
    sa.CheckConstraint("founding_year BETWEEN 1800 AND 2100", name="founding_year"),
)
sa.Index("ix_organizations_owner_created", organizations.c.owner_id, organizations.c.created_at.desc(), organizations.c.id.desc())
sa.Index("ix_organizations_kind_created", organizations.c.institution_kind, organizations.c.created_at.desc(), organizations.c.id.desc())

organization_areas = sa.Table(
    "organization_areas", metadata,
    sa.Column("organization_id", sa.BigInteger, sa.ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True),
    sa.Column("area_code", sa.Text, sa.ForeignKey("areas.code", ondelete="RESTRICT"), primary_key=True),
)
organization_services = sa.Table(
    "organization_services", metadata,
    sa.Column("organization_id", sa.BigInteger, sa.ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True),
    sa.Column("service_code", sa.Text, sa.ForeignKey("services.code", ondelete="RESTRICT"), primary_key=True),
)
project_memberships = sa.Table(
    "project_memberships", metadata,
    sa.Column("user_id", sa.BigInteger, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    sa.Column("organization_id", sa.BigInteger, primary_key=True),
    sa.Column("organization_kind", sa.Text, nullable=False, server_default="project"),
    sa.Column("member_role", sa.Text, nullable=False),
    timestamp_column(),
    sa.ForeignKeyConstraint(
        ["organization_id", "organization_kind"], ["organizations.id", "organizations.institution_kind"],
        ondelete="CASCADE", name="fk_project_memberships_organization_project",
    ),
    sa.CheckConstraint("organization_kind = 'project'", name="organization_kind"),
    sa.CheckConstraint("member_role IN ('staff','assisted')", name="member_role"),
)
sa.Index("ix_project_memberships_organization", project_memberships.c.organization_id)

donations = sa.Table(
    "donations", metadata,
    identity_column(),
    sa.Column("donor_user_id", sa.BigInteger, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
    sa.Column("project_organization_id", sa.BigInteger, sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False),
    sa.Column("pix_key_snapshot", sa.Text, nullable=False),
    sa.Column("amount_cents", sa.BigInteger, nullable=False),
    sa.Column("currency", sa.String(3), nullable=False, server_default="BRL"),
    sa.Column("payment_method", sa.Text, nullable=False, server_default="pix"),
    sa.Column("status", sa.Text, nullable=False, server_default="awaiting_payment"),
    sa.Column("end_to_end_id", sa.String(100), unique=True),
    sa.Column("receipt_code", sa.String(36), unique=True),
    timestamp_column(),
    sa.Column("payment_reported_at", sa.DateTime(timezone=True)),
    sa.Column("confirmed_at", sa.DateTime(timezone=True)),
    sa.Column("confirmed_by_user_id", sa.BigInteger, sa.ForeignKey("users.id", ondelete="RESTRICT")),
    sa.CheckConstraint("amount_cents > 0", name="amount_positive"),
    sa.CheckConstraint("currency = 'BRL'", name="currency_brl"),
    sa.CheckConstraint("payment_method = 'pix'", name="payment_method_pix"),
    sa.CheckConstraint("status IN ('awaiting_payment','awaiting_confirmation','confirmed','rejected')", name="status"),
    sa.CheckConstraint(
        "(status = 'awaiting_payment' AND end_to_end_id IS NULL AND payment_reported_at IS NULL) "
        "OR (status IN ('awaiting_confirmation','confirmed','rejected') AND end_to_end_id IS NOT NULL AND payment_reported_at IS NOT NULL)",
        name="payment_reference_matches_status",
    ),
    sa.CheckConstraint(
        "(status = 'confirmed' AND receipt_code IS NOT NULL AND confirmed_at IS NOT NULL AND confirmed_by_user_id IS NOT NULL) "
        "OR (status <> 'confirmed' AND receipt_code IS NULL AND confirmed_at IS NULL AND confirmed_by_user_id IS NULL)",
        name="receipt_only_after_confirmation",
    ),
)
sa.Index("ix_donations_donor_created", donations.c.donor_user_id, donations.c.created_at.desc(), donations.c.id.desc())
sa.Index("ix_donations_project_created", donations.c.project_organization_id, donations.c.created_at.desc(), donations.c.id.desc())

announcements = sa.Table(
    "announcements", metadata,
    identity_column(),
    sa.Column("title", sa.Text, nullable=False),
    sa.Column("body", sa.Text, nullable=False),
    sa.Column("category", sa.Text, nullable=False, server_default="plataforma"),
    timestamp_column("published_at"),
)
support_tickets = sa.Table(
    "support_tickets", metadata,
    identity_column(),
    sa.Column("user_id", sa.BigInteger, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
    sa.Column("subject", sa.Text, nullable=False),
    sa.Column("message", sa.Text, nullable=False),
    sa.Column("status", sa.Text, nullable=False, server_default="open"),
    timestamp_column(),
    sa.CheckConstraint("status IN ('open','in_progress','resolved')", name="status"),
)
sa.Index("ix_support_tickets_user_created", support_tickets.c.user_id, support_tickets.c.created_at.desc(), support_tickets.c.id.desc())
sa.Index("ix_support_tickets_status_created", support_tickets.c.status, support_tickets.c.created_at.desc(), support_tickets.c.id.desc())
