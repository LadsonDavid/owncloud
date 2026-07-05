from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone


class FolderBase(BaseModel):
    name: str
    user_id: Optional[str] = None  # Will be set by the API
    parent_id: Optional[str] = None  # None for root folders


class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None


class FolderInDB(FolderBase):
    id: str
    path: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Folder(FolderBase):
    id: str
    created_at: datetime 