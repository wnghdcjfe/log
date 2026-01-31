import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.llm_service import NvidiaLLMService, OpenAILLMService


@pytest.fixture
def mock_settings():
    with patch("app.services.llm_service.settings") as mock_settings:
        mock_settings.NVIDIA_API_KEY = "test_key"
        mock_settings.OPENAI_API_KEY = "test_openai_key"
        mock_settings.LLM_PROVIDER = "nvidia"
        mock_settings.OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
        mock_settings.OPENAI_MODEL_NAME = "gpt-4o"
        yield mock_settings


@pytest.mark.asyncio
async def test_get_embedding_nvidia_success(mock_settings):
    service = NvidiaLLMService()

    mock_response = {"data": [{"embedding": [0.1, 0.2, 0.3]}]}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.status_code = 200
        # IMPORTANT: json() is synchronous
        mock_post.return_value.json = MagicMock(return_value=mock_response)
        mock_post.return_value.raise_for_status.return_value = None

        embedding = await service.get_embedding("hello")

        assert embedding == [0.1, 0.2, 0.3]
        mock_post.assert_awaited()


@pytest.mark.asyncio
async def test_get_embedding_nvidia_missing_key():
    service = NvidiaLLMService()

    with patch("app.services.llm_service.settings") as mock_settings:
        mock_settings.NVIDIA_API_KEY = ""

        embedding = await service.get_embedding("hello")
        assert len(embedding) == 1024
        assert embedding[0] == 0.0


@pytest.mark.asyncio
async def test_generate_graph_cypher_success(mock_settings):
    service = NvidiaLLMService()

    mock_response_content = "CREATE (n:Record {id: '123'})"
    mock_api_response = {"choices": [{"message": {"content": mock_response_content}}]}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json = MagicMock(return_value=mock_api_response)

        cypher = await service.generate_graph_cypher(
            "diary entry", "user1", "rec1", "2023-01-01"
        )

        assert cypher == mock_response_content


@pytest.mark.asyncio
async def test_generate_answer_with_reasoning_success(mock_settings):
    service = NvidiaLLMService()

    mock_llm_json = '{"answer": "Yes", "confidence": 0.9, "reasoning_summary": "Logic"}'
    mock_api_response = {"choices": [{"message": {"content": mock_llm_json}}]}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json = MagicMock(return_value=mock_api_response)

        response = await service.generate_answer_with_reasoning("Question?", [], {})

        assert response["answer"] == "Yes"
        assert response["confidence"] == 0.9


@pytest.mark.asyncio
async def test_generate_answer_with_reasoning_parsing_failure(mock_settings):
    service = NvidiaLLMService()

    # Invalid JSON
    mock_llm_content = "Not JSON"
    mock_api_response = {"choices": [{"message": {"content": mock_llm_content}}]}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json = MagicMock(return_value=mock_api_response)

        response = await service.generate_answer_with_reasoning("Question?", [], {})

        assert "Error generating answer" in response["answer"]


@pytest.mark.asyncio
async def test_extract_entities_success(mock_settings):
    service = NvidiaLLMService()

    mock_json = """{
        "events": [{"summary": "Event1", "people": [], "actions": [], "outcomes": []}], 
        "emotions": ["Happy"]
    }"""
    mock_api_response = {"choices": [{"message": {"content": mock_json}}]}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json = MagicMock(return_value=mock_api_response)

        graph_data = await service.extract_entities("Valid text")

        assert len(graph_data.events) == 1
        assert graph_data.events[0].summary == "Event1"
        assert "Happy" in graph_data.emotions
