from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.config import settings
from app.database import get_db
from app.limiter import limiter
from app.models.user import AllowedUsername, User, UserTablePreference
from app.schemas.auth import LoginRequest, SignupRequest, UserProfile

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.app_env == "production",
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )


@router.post("/signup", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def signup(
    request: Request,
    response: Response,
    body: SignupRequest,
    db: AsyncSession = Depends(get_db),
):
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
        animal_type=body.animal_type,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    _set_auth_cookie(response, token)
    return {"ok": True}


@router.post("/login")
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    token = create_access_token({"sub": str(user.id)})
    _set_auth_cookie(response, token)
    return {"ok": True}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("token", path="/")
    return {"ok": True}


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
        animal_type=user.animal_type,
        total_points=user.total_points,
        created_at=user.created_at,
        selected_tables=selected_tables,
    )
