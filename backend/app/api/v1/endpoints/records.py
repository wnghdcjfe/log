from fastapi import APIRouter, HTTPException, Query

from app.models.schemas.record_req import (
    CreateRecordRequest,
    CreateRecordResponse,
    RecordResponse,
    UpdateRecordRequest,
)
from app.services.ingestion_service import ingestion_service
from app.services.record_service import record_service
from app.db.mongo import mongo_db

router = APIRouter()


@router.get("", response_model=list[RecordResponse])
async def list_records(userId: str | None = Query(default=None)):
    """List all diary records."""
    try:
        await mongo_db.connect()
        return await record_service.list_records(user_id=userId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{record_id}", response_model=RecordResponse)
async def get_record(record_id: str):
    """Get a single diary record by ID."""
    try:
        await mongo_db.connect()
        record = await record_service.get_record(record_id)
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")
        return record
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=CreateRecordResponse)
async def create_record(request: CreateRecordRequest):
    """
    Create a new diary record.
    - Saves to MongoDB
    - Generates Vector Embedding automatically
    """
    try:
        await mongo_db.connect()
        response = await ingestion_service.create_record(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{record_id}", response_model=RecordResponse)
async def update_record(record_id: str, request: UpdateRecordRequest):
    """Update a diary record."""
    try:
        await mongo_db.connect()
        record = await record_service.update_record(record_id, request)
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")
        return record
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{record_id}", status_code=204)
async def delete_record(record_id: str):
    """Soft-delete a diary record."""
    try:
        await mongo_db.connect()
        ok = await record_service.delete_record(record_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Record not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
