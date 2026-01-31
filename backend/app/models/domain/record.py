from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import uuid


class Record(BaseModel):
    recordId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    title: str
    content: str
    feel: List[str]
    date: str  # YYYY-MM-DD

    # Metadata
    createdAt: datetime = Field(default_factory=datetime.now)
    updatedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None

    # Machine Generated (Optional)
    embedding: Optional[List[float]] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat(),
        }
