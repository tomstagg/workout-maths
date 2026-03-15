import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SignupRequest(BaseModel):
    username: str
    password: str
    display_name: str | None = None


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
    total_points: int
    created_at: datetime
    selected_tables: list[int]

    model_config = ConfigDict(from_attributes=True)
