from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class CreateRecordRequest(BaseModel):
    title: str
    content: str
    feel: List[str]
    date: date
    userId: str = Field(default="default", description="User ID (default for single-user)")


class CreateRecordResponse(BaseModel):
    recordId: str


class UpdateRecordRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    feel: Optional[List[str]] = None
    date: Optional[date] = None


class RecordResponse(BaseModel):
    id: str
    title: str
    content: str
    feel: List[str]
    date: str
    userId: str
