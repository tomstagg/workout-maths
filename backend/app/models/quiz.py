import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, SmallInteger
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    table_numbers: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()"
    )
    total_questions: Mapped[int] = mapped_column(SmallInteger, default=10)
    correct_count: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    base_points: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_bonus_points: Mapped[int] = mapped_column(Integer, nullable=False)
    total_points_earned: Mapped[int] = mapped_column(Integer, nullable=False)
    max_streak: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    user: Mapped["User"] = relationship(back_populates="quiz_sessions")  # type: ignore[name-defined]  # noqa: F821
    answers: Mapped[list["QuizAnswer"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="QuizAnswer.position",
    )


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quiz_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    table_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    multiplier: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    correct_answer: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    selected_answer: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    session: Mapped["QuizSession"] = relationship(back_populates="answers")
