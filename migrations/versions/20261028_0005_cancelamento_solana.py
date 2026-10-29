"""Permite cancelar pedidos SOL e remove sua expiração automática."""
from alembic import op
import sqlalchemy as sa

revision = "20261028_0005"
down_revision = "20261028_0004"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("solana_payment_intents", "expires_at", existing_type=sa.DateTime(timezone=True), nullable=True)
    op.drop_constraint(op.f("ck_solana_payment_intents_status"), "solana_payment_intents", type_="check")
    op.create_check_constraint(op.f("ck_solana_payment_intents_status"), "solana_payment_intents", "status IN ('pending','confirmed','expired','cancelled')")
    op.execute("UPDATE solana_payment_intents SET expires_at = NULL WHERE status = 'pending'")


def downgrade():
    op.execute("UPDATE solana_payment_intents SET status = 'expired' WHERE status = 'cancelled'")
    op.execute("UPDATE solana_payment_intents SET expires_at = created_at + INTERVAL '10 minutes' WHERE expires_at IS NULL")
    op.drop_constraint(op.f("ck_solana_payment_intents_status"), "solana_payment_intents", type_="check")
    op.create_check_constraint(op.f("ck_solana_payment_intents_status"), "solana_payment_intents", "status IN ('pending','confirmed','expired')")
    op.alter_column("solana_payment_intents", "expires_at", existing_type=sa.DateTime(timezone=True), nullable=False)
