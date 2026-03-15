from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.quiz import QuizAnswer, QuizSession
from app.models.user import User
from app.schemas.quiz import AnswerResult, QuizSessionResponse, QuizSubmitRequest

router = APIRouter(prefix="/quiz", tags=["quiz"])

# Points per difficulty tier
EASY_TABLES = {2, 5, 10}
MEDIUM_TABLES = {3, 4, 6, 8, 9}
HARD_TABLES = {7, 11, 12}


def points_for_table(table: int) -> int:
    if table in EASY_TABLES:
        return 1
    if table in MEDIUM_TABLES:
        return 2
    return 3  # hard


def compute_scoring(answers: list) -> tuple[int, int, int, int]:
    """Returns (base_points, streak_bonus, total_points, max_streak)."""
    base_points = 0
    streak = 0
    max_streak = 0
    streak_bonus = 0
    streak_milestones_hit: set[int] = set()

    for ans in answers:
        if ans["is_correct"]:
            base_points += points_for_table(ans["table_number"])
            streak += 1
            max_streak = max(max_streak, streak)

            # Apply streak bonuses (cumulative)
            if streak >= 3 and 3 not in streak_milestones_hit:
                streak_bonus += 5
                streak_milestones_hit.add(3)
            if streak >= 5 and 5 not in streak_milestones_hit:
                streak_bonus += 10
                streak_milestones_hit.add(5)
            if streak >= 10 and 10 not in streak_milestones_hit:
                streak_bonus += 25
                streak_milestones_hit.add(10)
        else:
            streak = 0
            streak_milestones_hit.clear()

    return base_points, streak_bonus, base_points + streak_bonus, max_streak


@router.post(
    "/sessions", response_model=QuizSessionResponse, status_code=status.HTTP_201_CREATED
)
async def submit_quiz(
    body: QuizSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(body.answers) != 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz must have exactly 10 answers",
        )

    scored = []
    for i, ans in enumerate(body.answers):
        correct = ans.table_number * ans.multiplier
        scored.append(
            {
                "position": i,
                "table_number": ans.table_number,
                "multiplier": ans.multiplier,
                "correct_answer": correct,
                "selected_answer": ans.selected_answer,
                "is_correct": ans.selected_answer == correct,
                "answered_at": ans.answered_at,
            }
        )

    correct_count = sum(1 for a in scored if a["is_correct"])
    base_points, streak_bonus, total_earned, max_streak = compute_scoring(scored)
    table_numbers = sorted({a["table_number"] for a in scored})

    session = QuizSession(
        user_id=user.id,
        table_numbers=table_numbers,
        started_at=body.started_at,
        completed_at=datetime.now(UTC),
        total_questions=10,
        correct_count=correct_count,
        duration_seconds=body.duration_seconds,
        base_points=base_points,
        streak_bonus_points=streak_bonus,
        total_points_earned=total_earned,
        max_streak=max_streak,
    )
    db.add(session)
    await db.flush()

    for a in scored:
        db.add(QuizAnswer(session_id=session.id, **a))

    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(total_points=User.total_points + total_earned)
    )
    await db.commit()
    await db.refresh(session)

    return QuizSessionResponse(
        id=session.id,
        table_numbers=session.table_numbers,
        started_at=session.started_at,
        completed_at=session.completed_at,
        total_questions=session.total_questions,
        correct_count=session.correct_count,
        duration_seconds=session.duration_seconds,
        base_points=session.base_points,
        streak_bonus_points=session.streak_bonus_points,
        total_points_earned=session.total_points_earned,
        max_streak=session.max_streak,
        answers=[AnswerResult(**a) for a in scored],
    )


@router.get("/sessions", response_model=list[QuizSessionResponse])
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(QuizSession)
        .where(QuizSession.user_id == user.id)
        .order_by(QuizSession.completed_at.desc())
        .limit(20)
    )
    sessions = result.scalars().all()
    out = []
    for s in sessions:
        ans_result = await db.execute(
            select(QuizAnswer)
            .where(QuizAnswer.session_id == s.id)
            .order_by(QuizAnswer.position)
        )
        answers = [
            AnswerResult(
                position=a.position,
                table_number=a.table_number,
                multiplier=a.multiplier,
                correct_answer=a.correct_answer,
                selected_answer=a.selected_answer,
                is_correct=a.is_correct,
                answered_at=a.answered_at,
            )
            for a in ans_result.scalars().all()
        ]
        out.append(
            QuizSessionResponse(
                id=s.id,
                table_numbers=s.table_numbers,
                started_at=s.started_at,
                completed_at=s.completed_at,
                total_questions=s.total_questions,
                correct_count=s.correct_count,
                duration_seconds=s.duration_seconds,
                base_points=s.base_points,
                streak_bonus_points=s.streak_bonus_points,
                total_points_earned=s.total_points_earned,
                max_streak=s.max_streak,
                answers=answers,
            )
        )
    return out
