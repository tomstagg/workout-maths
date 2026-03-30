from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.quiz import QuizSession
from app.models.user import User, UserTablePreference

router = APIRouter(prefix="/users", tags=["users"])


class TablesUpdate(BaseModel):
    table_numbers: list[int]

    @field_validator("table_numbers")
    @classmethod
    def validate_table_numbers(cls, v: list[int]) -> list[int]:
        if len(v) > 11:
            raise ValueError("Cannot select more than 11 tables")
        invalid = [t for t in v if not (2 <= t <= 12)]
        if invalid:
            raise ValueError("Table numbers must be between 2 and 12")
        return v


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
    await db.execute(
        delete(UserTablePreference).where(UserTablePreference.user_id == user.id)
    )
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
