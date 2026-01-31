import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.db.vector import VectorDB


@pytest.mark.asyncio
async def test_insert_vector_success():
    db = VectorDB()

    with patch("app.db.vector.mongo_db") as mock_mongo:
        mock_collection = AsyncMock()
        mock_mongo.db.__getitem__.return_value = mock_collection

        await db.insert_vector("rec1", [0.1, 0.2])

        mock_collection.update_one.assert_awaited_once_with(
            {"recordId": "rec1"}, {"$set": {"embedding": [0.1, 0.2]}}
        )


@pytest.mark.asyncio
async def test_search_success():
    db = VectorDB()

    with patch("app.db.vector.mongo_db") as mock_mongo:
        mock_collection = (
            MagicMock()
        )  # Changed to MagicMock for sync aggregation access
        mock_mongo.db.__getitem__.return_value = mock_collection

        # Mock aggregation chain
        mock_cursor = AsyncMock()
        mock_cursor.to_list.return_value = [{"recordId": "r1", "score": 0.9}]

        # aggregate returns cursor synchronously
        mock_collection.aggregate.return_value = mock_cursor

        # Since mongo_db is patched on the module, mongo_db.db is accessed.
        # mongo_db.db is access via property/attr usually?
        # In snippet: mongo_db.db[settings.COLLECTION_NAME]
        # mock_mongo.db is a MagicMock (default).
        # mock_mongo.db.__getitem__ returns mock_collection.

        results = await db.search([0.1], "user1", top_k=2)

        assert len(results) == 1
        assert results[0]["recordId"] == "r1"

        # Verify pipeline structure vaguely
        args = mock_collection.aggregate.call_args[0][0]
        assert len(args) == 2
        assert "$vectorSearch" in args[0]
        assert args[0]["$vectorSearch"]["index"] == "vector_index"


@pytest.mark.asyncio
async def test_search_no_db_connection():
    db = VectorDB()
    with patch("app.db.vector.mongo_db") as mock_mongo:
        mock_mongo.db = None

        with pytest.raises(Exception) as exc:
            await db.search([0.1], "user1")
        assert "Database not connected" in str(exc.value)
