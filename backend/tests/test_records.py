import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.ingestion_service import ingestion_service
from app.models.schemas.record_req import CreateRecordResponse


# Mock IngestionService
async def mock_create_record(request):
    return CreateRecordResponse(recordId="mock-id-123")


@pytest.mark.asyncio
async def test_create_record(monkeypatch):
    monkeypatch.setattr(ingestion_service, "create_record", mock_create_record)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        payload = {
            "title": "My Diary",
            "content": "Today was a good day.",
            "feel": ["happy", "calm"],
            "date": "2023-10-27",
            "userId": "user123",
        }
        response = await ac.post("/api/v1/records", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["recordId"] == "mock-id-123"


@pytest.mark.asyncio
async def test_create_record_invalid_input(monkeypatch):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        payload = {
            "title": "My Diary",
            # Missing content
            "feel": ["happy"],
            "date": "2023-10-27",
            "userId": "user123",
        }
        response = await ac.post("/api/v1/records", json=payload)

    assert response.status_code == 422
