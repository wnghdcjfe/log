from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas.record_req import CreateRecordRequest, CreateRecordResponse
from app.services.ingestion_service import ingestion_service

router = APIRouter()


@router.post("", response_model=CreateRecordResponse)
async def create_record(request: CreateRecordRequest):
    """
    Create a new diary record.
    - Saves to MongoDB
    - Generates Vector Embedding automatically
    """
    try:
        response = await ingestion_service.create_record(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
