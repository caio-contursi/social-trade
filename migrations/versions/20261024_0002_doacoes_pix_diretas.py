"""Registra doações Pix diretas, sem custódia da plataforma.

Revision ID: 20261024_0002
Revises: 20261021_0001
"""

from alembic import op
import sqlalchemy as sa


revision = "20261024_0002"
down_revision = "20261021_0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("organizations", sa.Column("pix_key_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("organizations", sa.Column("pix_key_verified_by_user_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        op.f("fk_organizations_pix_key_verified_by_user_id_users"), "organizations", "users",
        ["pix_key_verified_by_user_id"], ["id"], ondelete="RESTRICT",
    )
    op.create_check_constraint(
        op.f("ck_organizations_pix_review_consistency"), "organizations",
        "(pix_key_verified_at IS NULL AND pix_key_verified_by_user_id IS NULL) "
        "OR (pix_key IS NOT NULL AND pix_key_verified_at IS NOT NULL AND pix_key_verified_by_user_id IS NOT NULL AND cnpj IS NOT NULL)",
    )
    op.create_table(
        "donations",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("donor_user_id", sa.BigInteger(), nullable=False),
        sa.Column("project_organization_id", sa.BigInteger(), nullable=False),
        sa.Column("pix_key_snapshot", sa.Text(), nullable=False),
        sa.Column("amount_cents", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="BRL", nullable=False),
        sa.Column("payment_method", sa.Text(), server_default="pix", nullable=False),
        sa.Column("status", sa.Text(), server_default="awaiting_payment", nullable=False),
        sa.Column("end_to_end_id", sa.String(length=100), nullable=True),
        sa.Column("receipt_code", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("payment_reported_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_by_user_id", sa.BigInteger(), nullable=True),
        sa.CheckConstraint("amount_cents > 0", name=op.f("ck_donations_amount_positive")),
        sa.CheckConstraint("currency = 'BRL'", name=op.f("ck_donations_currency_brl")),
        sa.CheckConstraint("payment_method = 'pix'", name=op.f("ck_donations_payment_method_pix")),
        sa.CheckConstraint("status IN ('awaiting_payment','awaiting_confirmation','confirmed','rejected')", name=op.f("ck_donations_status")),
        sa.CheckConstraint(
            "(status = 'awaiting_payment' AND end_to_end_id IS NULL AND payment_reported_at IS NULL) "
            "OR (status IN ('awaiting_confirmation','confirmed','rejected') AND end_to_end_id IS NOT NULL AND payment_reported_at IS NOT NULL)",
            name=op.f("ck_donations_payment_reference_matches_status"),
        ),
        sa.CheckConstraint(
            "(status = 'confirmed' AND receipt_code IS NOT NULL AND confirmed_at IS NOT NULL AND confirmed_by_user_id IS NOT NULL) "
            "OR (status <> 'confirmed' AND receipt_code IS NULL AND confirmed_at IS NULL AND confirmed_by_user_id IS NULL)",
            name=op.f("ck_donations_receipt_only_after_confirmation"),
        ),
        sa.ForeignKeyConstraint(["donor_user_id"], ["users.id"], name=op.f("fk_donations_donor_user_id_users"), ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["project_organization_id"], ["organizations.id"], name=op.f("fk_donations_project_organization_id_organizations"), ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["confirmed_by_user_id"], ["users.id"], name=op.f("fk_donations_confirmed_by_user_id_users"), ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_donations")),
        sa.UniqueConstraint("end_to_end_id", name=op.f("uq_donations_end_to_end_id")),
        sa.UniqueConstraint("receipt_code", name=op.f("uq_donations_receipt_code")),
    )
    op.create_index("ix_donations_donor_created", "donations", ["donor_user_id", sa.literal_column("created_at DESC"), sa.literal_column("id DESC")])
    op.create_index("ix_donations_project_created", "donations", ["project_organization_id", sa.literal_column("created_at DESC"), sa.literal_column("id DESC")])


def downgrade():
    op.drop_index("ix_donations_project_created", table_name="donations")
    op.drop_index("ix_donations_donor_created", table_name="donations")
    op.drop_table("donations")
    op.drop_constraint(op.f("ck_organizations_pix_review_consistency"), "organizations", type_="check")
    op.drop_constraint(op.f("fk_organizations_pix_key_verified_by_user_id_users"), "organizations", type_="foreignkey")
    op.drop_column("organizations", "pix_key_verified_by_user_id")
    op.drop_column("organizations", "pix_key_verified_at")
