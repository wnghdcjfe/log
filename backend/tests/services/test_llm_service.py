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


# ============== Rerank 테스트 ==============

@pytest.mark.asyncio
async def test_rerank_nvidia_success(mock_settings):
    """NVIDIA 서비스의 rerank가 정상 동작하는지 테스트"""
    service = NvidiaLLMService()

    documents = [
        {"content": "Document 1 about cats", "title": "Cats"},
        {"content": "Document 2 about dogs", "title": "Dogs"},
        {"content": "Document 3 about birds", "title": "Birds"},
    ]

    mock_json = '{"scores": [0.9, 0.3, 0.6]}'
    mock_api_response = {"choices": [{"message": {"content": mock_json}}]}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json = MagicMock(return_value=mock_api_response)

        result = await service.rerank("What about cats?", documents, top_k=2)

        # 점수에 따라 정렬되어야 함
        assert len(result) == 2  # top_k=2
        assert result[0]["title"] == "Cats"  # 0.9점으로 1위
        assert result[1]["title"] == "Birds"  # 0.6점으로 2위
        assert result[0]["relevance_score"] == 0.9


@pytest.mark.asyncio
async def test_rerank_openai_success(mock_settings):
    """OpenAI 서비스의 rerank가 정상 동작하는지 테스트"""
    service = OpenAILLMService()

    documents = [
        {"content": "Old memory about school", "title": "School"},
        {"content": "Recent memory about work", "title": "Work"},
    ]

    mock_json = '{"scores": [0.4, 0.8]}'
    mock_api_response = {"choices": [{"message": {"content": mock_json}}]}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json = MagicMock(return_value=mock_api_response)

        result = await service.rerank("Tell me about work", documents, top_k=2)

        assert len(result) == 2
        assert result[0]["title"] == "Work"  # 0.8점으로 1위
        assert result[0]["relevance_score"] == 0.8


@pytest.mark.asyncio
async def test_rerank_empty_documents():
    """빈 문서 리스트에 대한 rerank 테스트"""
    service = NvidiaLLMService()

    result = await service.rerank("Any question", [], top_k=5)

    assert result == []


@pytest.mark.asyncio
async def test_rerank_missing_api_key():
    """API 키가 없을 때 원본 순서 반환 테스트"""
    service = NvidiaLLMService()

    documents = [
        {"content": "Doc 1", "title": "First"},
        {"content": "Doc 2", "title": "Second"},
    ]

    with patch("app.services.llm_service.settings") as mock_settings:
        mock_settings.NVIDIA_API_KEY = ""

        result = await service.rerank("Question", documents, top_k=2)

        # API 키 없으면 원본 순서 반환
        assert len(result) == 2
        assert result[0]["title"] == "First"


@pytest.mark.asyncio
async def test_rerank_parsing_error(mock_settings):
    """JSON 파싱 에러 시 원본 순서 반환 테스트"""
    service = NvidiaLLMService()

    documents = [
        {"content": "Doc 1", "title": "First"},
        {"content": "Doc 2", "title": "Second"},
    ]

    mock_api_response = {"choices": [{"message": {"content": "Invalid JSON"}}]}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json = MagicMock(return_value=mock_api_response)

        result = await service.rerank("Question", documents, top_k=2)

        # 에러 시 원본 순서 반환
        assert len(result) == 2
        assert result[0]["title"] == "First"
