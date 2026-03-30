import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class SignupRequest(BaseModel):
    username: str
    password: str
    display_name: str | None = None
    animal_type: str | None = None

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9_]{2,30}$", v):
            raise ValueError(
                "Username must be 2–30 characters: lowercase letters, numbers, or underscores"
            )
        return v

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        if len(v) > 128:
            raise ValueError("Password is too long")
        return v

    @field_validator("display_name")
    @classmethod
    def display_name_length(cls, v: str | None) -> str | None:
        if v is not None and len(v.strip()) > 50:
            raise ValueError("Display name must be 50 characters or fewer")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    animal_type: str | None = None
    total_points: int
    created_at: datetime
    selected_tables: list[int]

    model_config = ConfigDict(from_attributes=True)
