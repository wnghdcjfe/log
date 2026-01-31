from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any


class QuestionRequest(BaseModel):
    userId: str
    text: str
    searchSessionId: Optional[str] = None


class QuestionResponse(BaseModel):
    answer: str
    reasoningPath: Dict[str, Any] = Field(
        default_factory=dict, description="Nodes, edges, and records used for reasoning"
    )
    confidence: float
