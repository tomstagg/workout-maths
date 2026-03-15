"""add_users_and_quiz_tables

Revision ID: f33c0914d9bc
Revises:
Create Date: 2026-03-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f33c0914d9bc"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "allowed_usernames",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("total_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "user_table_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("table_number", sa.SmallInteger(), nullable=False),
        sa.UniqueConstraint("user_id", "table_number", name="uq_user_table"),
    )

    op.create_table(
        "quiz_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("table_numbers", postgresql.ARRAY(sa.Integer()), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("total_questions", sa.SmallInteger(), nullable=False, server_default="10"),
        sa.Column("correct_count", sa.SmallInteger(), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=False),
        sa.Column("base_points", sa.Integer(), nullable=False),
        sa.Column("streak_bonus_points", sa.Integer(), nullable=False),
        sa.Column("total_points_earned", sa.Integer(), nullable=False),
        sa.Column("max_streak", sa.SmallInteger(), nullable=False),
    )

    op.create_table(
        "quiz_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("quiz_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.SmallInteger(), nullable=False),
        sa.Column("table_number", sa.SmallInteger(), nullable=False),
        sa.Column("multiplier", sa.SmallInteger(), nullable=False),
        sa.Column("correct_answer", sa.SmallInteger(), nullable=False),
        sa.Column("selected_answer", sa.SmallInteger(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("quiz_answers")
    op.drop_table("quiz_sessions")
    op.drop_table("user_table_preferences")
    op.drop_table("users")
    op.drop_table("allowed_usernames")
