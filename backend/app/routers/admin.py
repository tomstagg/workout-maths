from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, get_current_admin
from app.config import settings
from app.database import get_db
from app.limiter import limiter
from app.models.user import AllowedUsername
from app.schemas.admin import (
    AdminLoginRequest,
    AllowedUsernameCreate,
    AllowedUsernameResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])

_IS_PROD = settings.app_env == "production"


@router.post("/login")
@limiter.limit("5/minute")
async def admin_login(
    request: Request,
    response: Response,
    body: AdminLoginRequest,
):
    if (
        body.username != settings.admin_username
        or body.password != settings.admin_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials"
        )
    token = create_access_token({"sub": "admin", "is_admin": True})
    response.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        samesite="none" if _IS_PROD else "lax",
        secure=_IS_PROD,
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )
    return {"ok": True}


@router.post("/logout")
async def admin_logout(response: Response):
    response.delete_cookie("admin_token", path="/")
    return {"ok": True}


@router.get("/usernames", response_model=list[AllowedUsernameResponse])
async def list_usernames(
    _: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AllowedUsername).order_by(AllowedUsername.created_at)
    )
    return result.scalars().all()


@router.post(
    "/usernames",
    response_model=AllowedUsernameResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_username(
    body: AllowedUsernameCreate,
    _: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(AllowedUsername).where(AllowedUsername.username == body.username)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already in allowed list",
        )

    entry = AllowedUsername(username=body.username)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/usernames/{username}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_username(
    username: str,
    _: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        delete(AllowedUsername).where(AllowedUsername.username == username)
    )
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Username not found"
        )
    await db.commit()
