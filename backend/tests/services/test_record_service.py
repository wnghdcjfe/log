import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.record_service import RecordService
from app.models.schemas.record_req import UpdateRecordRequest
from bson import ObjectId
from datetime import date


class AsyncIterator:
    def __init__(self, items):
        self.items = iter(items)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self.items)
        except StopIteration:
            raise StopAsyncIteration


@pytest.fixture
def mock_mongo():
    with patch("app.services.record_service.mongo_db") as mock:
        yield mock


@pytest.mark.asyncio
async def test_list_records(mock_mongo):
    service = RecordService()
    mock_collection = MagicMock()
    mock_mongo.db.__getitem__.return_value = mock_collection

    doc = {
        "_id": ObjectId("507f1f77bcf86cd799439011"),
        "title": "T",
        "content": "C",
        "feel": ["Happy"],
        "date": "2023-01-01",
        "userId": "u1",
    }

    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = AsyncIterator([doc])
    mock_collection.find.return_value = mock_cursor

    results = await service.list_records("u1")

    assert len(results) == 1
    assert results[0].title == "T"
    assert results[0].userId == "u1"


@pytest.mark.asyncio
async def test_get_record_success(mock_mongo):
    service = RecordService()
    mock_collection = MagicMock()
    mock_mongo.db.__getitem__.return_value = mock_collection

    doc = {"_id": ObjectId("507f1f77bcf86cd799439011"), "title": "T"}
    mock_collection.find_one = AsyncMock(return_value=doc)

    result = await service.get_record("507f1f77bcf86cd799439011")

    assert result is not None
    assert result.title == "T"


@pytest.mark.asyncio
async def test_get_record_not_found(mock_mongo):
    service = RecordService()
    mock_collection = MagicMock()
    mock_mongo.db.__getitem__.return_value = mock_collection

    mock_collection.find_one = AsyncMock(return_value=None)

    result = await service.get_record("507f1f77bcf86cd799439011")
    assert result is None


@pytest.mark.asyncio
async def test_update_record_success(mock_mongo):
    service = RecordService()
    mock_collection = MagicMock()
    mock_mongo.db.__getitem__.return_value = mock_collection

    oid = "507f1f77bcf86cd799439011"

    # First find_one returns existing
    mock_collection.find_one = AsyncMock(
        return_value={"_id": ObjectId(oid), "title": "Old"}
    )
    # find_one_and_update returns updated
    mock_collection.find_one_and_update = AsyncMock(
        return_value={"_id": ObjectId(oid), "title": "New"}
    )

    req = UpdateRecordRequest(title="New")

    result = await service.update_record(oid, req)

    assert result.title == "New"
    mock_collection.find_one_and_update.assert_awaited()


@pytest.mark.asyncio
async def test_delete_record_success(mock_mongo):
    service = RecordService()
    mock_collection = MagicMock()
    mock_mongo.db.__getitem__.return_value = mock_collection

    mock_collection.find_one_and_update = AsyncMock(return_value={"_id": ObjectId()})

    result = await service.delete_record("507f1f77bcf86cd799439011")

    assert result is True


@pytest.mark.asyncio
async def test_delete_record_invalid_id(mock_mongo):
    service = RecordService()
    result = await service.delete_record("invalid")
    assert result is False
