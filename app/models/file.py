from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class FileBase(BaseModel):
    filename: str
    content_type: str
    size: int
    user_id: str


class FileCreate(FileBase):
    pass


class FileInDB(FileBase):
    id: str
    path: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class File(FileBase):
    id: str
    created_at: datetime 