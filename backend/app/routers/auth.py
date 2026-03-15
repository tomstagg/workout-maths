from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models.user import AllowedUsername, User, UserTablePreference
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserProfile

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check username is pre-approved
    allowed = await db.execute(
        select(AllowedUsername).where(AllowedUsername.username == body.username)
    )
    if allowed.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username not approved"
        )

    # Check not already registered
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        display_name=body.display_name or body.username,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserProfile)
async def me(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    prefs = await db.execute(
        select(UserTablePreference).where(UserTablePreference.user_id == user.id)
    )
    selected_tables = sorted([p.table_number for p in prefs.scalars().all()])
    return UserProfile(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        total_points=user.total_points,
        created_at=user.created_at,
        selected_tables=selected_tables,
    )
