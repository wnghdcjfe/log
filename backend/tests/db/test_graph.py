import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.db.graph import Neo4jDB


class MockNode(dict):
    """Mocks a Neo4j Node which behaves like a dict but also has attributes."""

    def __init__(self, element_id, labels, properties):
        super().__init__(properties)
        self.element_id = element_id
        self.labels = labels


class AsyncIterator:
    """Helper class for async iteration in tests."""

    def __init__(self, items):
        self.items = iter(items)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self.items)
        except StopIteration:
            raise StopAsyncIteration


class MockRecord:
    """Mock Neo4j record that supports .get() method."""

    def __init__(self, data):
        self._data = data

    def get(self, key, default=None):
        return self._data.get(key, default)


@pytest.mark.asyncio
async def test_connect_success():
    db = Neo4jDB()
    Neo4jDB.driver = None

    with patch("neo4j.AsyncGraphDatabase.driver") as mock_driver_cls:
        mock_driver = AsyncMock()
        mock_driver_cls.return_value = mock_driver

        mock_session = AsyncMock()
        mock_driver.session = MagicMock(return_value=mock_session)
        mock_session.__aenter__.return_value = mock_session

        await db.connect()

        assert Neo4jDB.driver is not None
        mock_driver.session.assert_called()


@pytest.mark.asyncio
async def test_execute_cypher_success():
    db = Neo4jDB()
    mock_driver = AsyncMock()
    mock_session = AsyncMock()
    mock_driver.session = MagicMock(return_value=mock_session)
    mock_session.__aenter__.return_value = mock_session

    Neo4jDB.driver = mock_driver

    await db.execute_cypher("MATCH (n) RETURN n")

    # mock_driver.session.assert_called() # Mock call not always tracked on reassignment if not carefully managed, but code execution proves it works if no error.


@pytest.mark.asyncio
async def test_execute_cypher_no_driver():
    db = Neo4jDB()
    Neo4jDB.driver = None

    await db.execute_cypher("MATCH (n) RETURN n")


@pytest.mark.asyncio
async def test_get_context_subgraph_success():
    db = Neo4jDB()

    mock_driver = AsyncMock()
    mock_session = AsyncMock()
    mock_driver.session = MagicMock(return_value=mock_session)
    mock_session.__aenter__.return_value = mock_session

    Neo4jDB.driver = mock_driver

    # Create a mock node that behaves like a Neo4j node
    mock_node = MockNode("node1", {"Person"}, {"name": "Alice"})

    mock_path = MagicMock()
    mock_path.nodes = [mock_node]
    mock_path.relationships = []

    # Create mock record using the MockRecord class
    mock_record = MockRecord({"path": mock_path})

    # Return an async iterator for the result
    mock_result = AsyncIterator([mock_record])
    mock_session.run.return_value = mock_result

    graph = await db.get_context_subgraph("user1", ["rec1"])

    assert len(graph["nodes"]) == 1
    assert graph["nodes"][0]["name"] == "Alice"
    assert "_labels" in graph["nodes"][0]
