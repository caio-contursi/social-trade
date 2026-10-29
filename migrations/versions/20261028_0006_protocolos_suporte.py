"""Protocolos aleatórios de seis dígitos, únicos e persistidos por ticket."""
import random

from alembic import op
import sqlalchemy as sa

revision = "20261028_0006"
down_revision = "20261028_0005"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("support_tickets", sa.Column("protocol", sa.String(6), nullable=True))
    db = op.get_bind()
    identifiers = list(db.execute(sa.text("SELECT id FROM support_tickets ORDER BY id")).scalars())
    if len(identifiers) > 1_000_000:
        raise RuntimeError("A quantidade de tickets excede os protocolos de seis dígitos disponíveis.")
    codes = random.SystemRandom().sample(range(1_000_000), len(identifiers))
    if identifiers:
        db.execute(sa.text("UPDATE support_tickets SET protocol = :protocol WHERE id = :id"), [
            {"id": identifier, "protocol": f"{code:06d}"} for identifier, code in zip(identifiers, codes)
        ])
    op.alter_column("support_tickets", "protocol", existing_type=sa.String(6), nullable=False)
    op.create_unique_constraint(op.f("uq_support_tickets_protocol"), "support_tickets", ["protocol"])
    op.create_check_constraint(op.f("ck_support_tickets_protocol_format"), "support_tickets", "protocol ~ '^[0-9]{6}$'")


def downgrade():
    op.drop_constraint(op.f("ck_support_tickets_protocol_format"), "support_tickets", type_="check")
    op.drop_constraint(op.f("uq_support_tickets_protocol"), "support_tickets", type_="unique")
    op.drop_column("support_tickets", "protocol")
