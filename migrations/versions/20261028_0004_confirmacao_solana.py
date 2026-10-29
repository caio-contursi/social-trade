"""Registra intenções SOL e referências para conciliação on-chain.

Revision ID: 20261028_0004
Revises: 20261026_0003
"""

from alembic import op
import sqlalchemy as sa


revision = "20261028_0004"
down_revision = "20261026_0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "solana_payment_intents",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("donor_user_id", sa.BigInteger(), nullable=False),
        sa.Column("target", sa.Text(), nullable=False),
        sa.Column("project_organization_id", sa.BigInteger(), nullable=True),
        sa.Column("cause_code", sa.Text(), nullable=True),
        sa.Column("amount_lamports", sa.BigInteger(), nullable=False),
        sa.Column("reference", sa.String(length=44), nullable=False),
        sa.Column("status", sa.Text(), server_default="pending", nullable=False),
        sa.Column("transaction_signature", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("target IN ('project','socialtrade')", name=op.f("ck_solana_payment_intents_target")),
        sa.CheckConstraint(
            "(target = 'project' AND project_organization_id IS NOT NULL) OR "
            "(target = 'socialtrade' AND project_organization_id IS NULL)",
            name=op.f("ck_solana_payment_intents_target_project_matches"),
        ),
        sa.CheckConstraint("amount_lamports BETWEEN 100000 AND 100000000000", name=op.f("ck_solana_payment_intents_amount_lamports_range")),
        sa.CheckConstraint("status IN ('pending','confirmed','expired')", name=op.f("ck_solana_payment_intents_status")),
        sa.CheckConstraint(
            "(status = 'confirmed' AND transaction_signature IS NOT NULL AND confirmed_at IS NOT NULL) OR "
            "(status <> 'confirmed' AND transaction_signature IS NULL AND confirmed_at IS NULL)",
            name=op.f("ck_solana_payment_intents_confirmation_matches_status"),
        ),
        sa.ForeignKeyConstraint(["cause_code"], ["areas.code"], name=op.f("fk_solana_payment_intents_cause_code_areas"), ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["donor_user_id"], ["users.id"], name=op.f("fk_solana_payment_intents_donor_user_id_users"), ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["project_organization_id"], ["organizations.id"], name=op.f("fk_solana_payment_intents_project_organization_id_organizations"), ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_solana_payment_intents")),
        sa.UniqueConstraint("reference", name=op.f("uq_solana_payment_intents_reference")),
        sa.UniqueConstraint("transaction_signature", name=op.f("uq_solana_payment_intents_transaction_signature")),
    )
    op.create_index(
        "ix_solana_intents_donor_created", "solana_payment_intents",
        ["donor_user_id", sa.text("created_at DESC"), sa.text("id DESC")],
    )


def downgrade():
    op.drop_index("ix_solana_intents_donor_created", table_name="solana_payment_intents")
    op.drop_table("solana_payment_intents")
