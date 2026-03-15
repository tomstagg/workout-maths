from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.quiz import QuizSession
from app.models.user import User
from app.schemas.quiz import LeaderboardEntry

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardEntry])
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    quiz_counts = (
        select(QuizSession.user_id, func.count(QuizSession.id).label("quiz_count"))
        .group_by(QuizSession.user_id)
        .subquery()
    )

    result = await db.execute(
        select(
            User.username,
            User.display_name,
            User.total_points,
            func.coalesce(quiz_counts.c.quiz_count, 0).label("quiz_count"),
        )
        .outerjoin(quiz_counts, User.id == quiz_counts.c.user_id)
        .where(User.total_points > 0)
        .order_by(User.total_points.desc())
        .limit(50)
    )

    rows = result.all()
    return [
        LeaderboardEntry(
            rank=i + 1,
            username=row.username,
            display_name=row.display_name,
            total_points=row.total_points,
            quiz_count=row.quiz_count,
        )
        for i, row in enumerate(rows)
    ]
