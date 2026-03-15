from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User, UserTablePreference
from app.models.quiz import QuizSession

router = APIRouter(prefix="/users", tags=["users"])


class TablesUpdate(BaseModel):
    table_numbers: list[int]


class UserStats(BaseModel):
    total_points: int
    quiz_count: int
    selected_tables: list[int]


@router.put("/me/tables", response_model=list[int])
async def update_tables(
    body: TablesUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    valid = {t for t in body.table_numbers if 2 <= t <= 12}
    await db.execute(delete(UserTablePreference).where(UserTablePreference.user_id == user.id))
    for t in valid:
        db.add(UserTablePreference(user_id=user.id, table_number=t))
    await db.commit()
    return sorted(valid)


@router.get("/me/stats", response_model=UserStats)
async def get_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prefs = await db.execute(
        select(UserTablePreference).where(UserTablePreference.user_id == user.id)
    )
    selected_tables = sorted([p.table_number for p in prefs.scalars().all()])

    quiz_count_result = await db.execute(
        select(func.count()).where(QuizSession.user_id == user.id)
    )
    quiz_count = quiz_count_result.scalar() or 0

    return UserStats(
        total_points=user.total_points,
        quiz_count=quiz_count,
        selected_tables=selected_tables,
    )
