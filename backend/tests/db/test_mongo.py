import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.db.mongo import MongoDB


@pytest.mark.asyncio
async def test_connect_success():
    db = MongoDB()
    MongoDB.client = None
    MongoDB.db = None

    # Patch where it is USED.
    with patch("app.db.mongo.AsyncIOMotorClient") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.__getitem__.return_value = "mock_db"

        await db.connect()

        assert MongoDB.client is not None
        assert MongoDB.db == "mock_db"


@pytest.mark.asyncio
async def test_close_success():
    db = MongoDB()
    mock_client = MagicMock()
    MongoDB.client = mock_client

    await db.close()

    mock_client.close.assert_called_once()
    assert MongoDB.client is None
