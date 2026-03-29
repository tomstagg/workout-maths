"""add_animal_type_to_users

Revision ID: a1b2c3d4e5f6
Revises: f33c0914d9bc
Create Date: 2026-03-29

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f33c0914d9bc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("animal_type", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "animal_type")
