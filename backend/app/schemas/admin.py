import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AllowedUsernameCreate(BaseModel):
    username: str


class AllowedUsernameResponse(BaseModel):
    id: uuid.UUID
    username: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
