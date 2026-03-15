import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AnswerSubmit(BaseModel):
    table_number: int
    multiplier: int
    selected_answer: int
    answered_at: datetime


class QuizSubmitRequest(BaseModel):
    started_at: datetime
    duration_seconds: float
    answers: list[AnswerSubmit]


class AnswerResult(BaseModel):
    position: int
    table_number: int
    multiplier: int
    correct_answer: int
    selected_answer: int
    is_correct: bool
    answered_at: datetime


class QuizSessionResponse(BaseModel):
    id: uuid.UUID
    table_numbers: list[int]
    started_at: datetime
    completed_at: datetime
    total_questions: int
    correct_count: int
    duration_seconds: float
    base_points: int
    streak_bonus_points: int
    total_points_earned: int
    max_streak: int
    answers: list[AnswerResult]

    model_config = ConfigDict(from_attributes=True)


class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    display_name: str
    total_points: int
    quiz_count: int
