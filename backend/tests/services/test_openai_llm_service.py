import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.llm_service import OpenAILLMService


@pytest.fixture
def mock_settings_openai():
    with patch("app.services.llm_service.settings") as mock_settings:
        mock_settings.NVIDIA_API_KEY = "test_key"
        mock_settings.OPENAI_API_KEY = "test_openai_key"
        mock_settings.LLM_PROVIDER = "openai"
        mock_settings.OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
        mock_settings.OPENAI_MODEL_NAME = "gpt-4o"
        yield mock_settings


@pytest.mark.asyncio
async def test_openai_get_embedding_success(mock_settings_openai):
    service = OpenAILLMService()

    # Mock response structure for OpenAI embedding
    mock_response = {"data": [{"embedding": [0.9] * 1536}]}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json = MagicMock(return_value=mock_response)

        embedding = await service.get_embedding("text")

        assert len(embedding) == 1536
        assert embedding[0] == 0.9

        # Verify URL is OpenAI's
        args, _ = mock_post.call_args
        assert args[0] == "https://api.openai.com/v1/embeddings"


@pytest.mark.asyncio
async def test_openai_chat_api_override(mock_settings_openai):
    service = OpenAILLMService()

    mock_api_response = {"choices": [{"message": {"content": "OpenAI says hi"}}]}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json = MagicMock(return_value=mock_api_response)

        # Test indirectly via generate_graph_cypher or just _call_chat_api
        # But _call_chat_api is what changed.
        # Let's call a public method that uses it.
        result = await service.generate_graph_cypher("text", "u1", "r1", "d1")

        assert result == "OpenAI says hi"

        # Verify payload model name substitution
        _, kwargs = mock_post.call_args
        assert kwargs["json"]["model"] == "gpt-4o"
        assert "Authorization" in kwargs["headers"]
        assert "Bearer test_openai_key" in kwargs["headers"]["Authorization"]


@pytest.mark.asyncio
async def test_openai_missing_key():
    service = OpenAILLMService()

    with patch("app.services.llm_service.settings") as mock_settings:
        mock_settings.OPENAI_API_KEY = ""

        embedding = await service.get_embedding("text")
        assert len(embedding) == 1536
        assert embedding[0] == 0.0
