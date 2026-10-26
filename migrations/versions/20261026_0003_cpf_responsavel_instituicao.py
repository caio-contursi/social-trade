"""Armazena o CPF privado de quem responde pela conta institucional.

Revision ID: 20261026_0003
Revises: 20261024_0002
"""

from alembic import op
import sqlalchemy as sa


revision = "20261026_0003"
down_revision = "20261024_0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("responsible_cpf", sa.String(length=11), nullable=True))


def downgrade():
    op.drop_column("users", "responsible_cpf")
