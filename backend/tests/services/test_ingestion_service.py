import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.ingestion_service import IngestionService
from app.models.schemas.record_req import CreateRecordRequest
from datetime import date


@pytest.fixture
def mock_req():
    return CreateRecordRequest(
        title="Test Title",
        content="Test Content",
        feel=["Happy"],
        date=date(2023, 10, 27),
        userId="user123",
    )


@pytest.mark.asyncio
async def test_create_record_success(mock_req):
    service = IngestionService()

    # Mock dependencies
    with patch(
        "app.services.ingestion_service.llm_service.get_embedding",
        new_callable=AsyncMock,
    ) as mock_embed, patch(
        "app.services.ingestion_service.mongo_db"
    ) as mock_mongo, patch(
        "app.services.ingestion_service.llm_service.generate_graph_cypher",
        new_callable=AsyncMock,
    ) as mock_cypher_gen, patch(
        "app.services.ingestion_service.neo4j_db.execute_cypher", new_callable=AsyncMock
    ) as mock_cypher_exec:

        # Setup Mocks
        mock_embed.return_value = [0.1, 0.2]

        mock_collection = AsyncMock()
        mock_mongo.db.__getitem__.return_value = mock_collection
        mock_collection.insert_one.return_value.inserted_id = "new_record_id"

        mock_cypher_gen.return_value = "CREATE (n) RETURN n"

        # Execute
        response = await service.create_record(mock_req)

        # Verify
        assert response.recordId == "new_record_id"
        mock_embed.assert_awaited_once()
        mock_collection.insert_one.assert_awaited_once()
        mock_cypher_gen.assert_awaited_once()
        mock_cypher_exec.assert_awaited_once_with("CREATE (n) RETURN n")


@pytest.mark.asyncio
async def test_create_record_db_not_connected(mock_req):
    service = IngestionService()

    with patch(
        "app.services.ingestion_service.llm_service.get_embedding",
        new_callable=AsyncMock,
    ) as mock_embed, patch("app.services.ingestion_service.mongo_db") as mock_mongo:

        mock_embed.return_value = [0.0]
        mock_mongo.db = None  # Simulate no connection

        with pytest.raises(Exception) as excinfo:
            await service.create_record(mock_req)

        assert "Database connection not established" in str(excinfo.value)
