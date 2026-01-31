from fastapi import APIRouter
from app.api.v1.endpoints import records, question

api_router = APIRouter()
api_router.include_router(records.router, prefix="/records", tags=["records"])
api_router.include_router(question.router, prefix="/question", tags=["question"])
