from pydantic import BaseModel
from typing import List
from datetime import date


class CreateRecordRequest(BaseModel):
    title: str
    content: str
    feel: List[str]
    date: date
    userId: str


class CreateRecordResponse(BaseModel):
    recordId: str
