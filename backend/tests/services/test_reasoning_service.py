import pytest
from unittest.mock import AsyncMock, patch
from app.services.reasoning_service import ReasoningService
from app.models.schemas.question_req import QuestionRequest


@pytest.fixture
def mock_req():
    return QuestionRequest(text="Who am I?", userId="user123")


@pytest.mark.asyncio
async def test_answer_question_success(mock_req):
    service = ReasoningService()

    with patch(
        "app.services.reasoning_service.llm_service.get_embedding",
        new_callable=AsyncMock,
    ) as mock_embed, patch(
        "app.services.reasoning_service.vector_db.search", new_callable=AsyncMock
    ) as mock_vec_search, patch(
        "app.services.reasoning_service.llm_service.rerank",
        new_callable=AsyncMock,
    ) as mock_rerank, patch(
        "app.services.reasoning_service.neo4j_db.get_context_subgraph",
        new_callable=AsyncMock,
    ) as mock_graph_get, patch(
        "app.services.reasoning_service.llm_service.generate_answer_with_reasoning",
        new_callable=AsyncMock,
    ) as mock_llm_reason:

        # Setup mocks
        mock_embed.return_value = [0.1, 0.2]

        # Hybrid search 결과 (MongoDB _id + recordId 포함)
        from bson import ObjectId
        mock_object_id = ObjectId()
        mock_vec_results = [
            {"_id": mock_object_id, "recordId": "uuid-rec1", "content": "content1", "score": 0.9}
        ]
        mock_vec_search.return_value = mock_vec_results

        # Rerank 결과 (동일한 문서 반환)
        mock_rerank.return_value = mock_vec_results

        mock_graph_context = {"nodes": [{"id": "n1"}], "edges": []}
        mock_graph_get.return_value = mock_graph_context

        mock_llm_response = {
            "answer": "You are User.",
            "confidence": 0.95,
            "reasoning_summary": "Found in record.",
        }
        mock_llm_reason.return_value = mock_llm_response

        # Execute
        response = await service.answer_question(mock_req)

        # Verify
        assert response.answer == "You are User."
        assert response.confidence == 0.95
        assert response.reasoningPath["records"] == [str(mock_object_id)]
        assert response.reasoningPath["graph_snapshot"]["node_count"] == 1

        mock_embed.assert_awaited_once_with("Who am I?")
        mock_vec_search.assert_awaited_once()
        mock_rerank.assert_awaited_once()
        mock_graph_get.assert_awaited_once()
        mock_llm_reason.assert_awaited_once()


@pytest.mark.asyncio
async def test_answer_question_no_context(mock_req):
    service = ReasoningService()

    with patch(
        "app.services.reasoning_service.llm_service.get_embedding",
        new_callable=AsyncMock,
    ) as mock_embed, patch(
        "app.services.reasoning_service.vector_db.search", new_callable=AsyncMock
    ) as mock_vec_search, patch(
        "app.services.reasoning_service.llm_service.rerank",
        new_callable=AsyncMock,
    ) as mock_rerank, patch(
        "app.services.reasoning_service.neo4j_db.get_context_subgraph",
        new_callable=AsyncMock,
    ) as mock_graph_get, patch(
        "app.services.reasoning_service.llm_service.generate_answer_with_reasoning",
        new_callable=AsyncMock,
    ) as mock_llm_reason:

        mock_embed.return_value = [0.0]
        mock_vec_search.return_value = []  # No records found
        mock_rerank.return_value = []  # No records after rerank
        mock_graph_get.return_value = {"nodes": [], "edges": []}

        mock_llm_response = {
            "answer": "I don't know.",
            "confidence": 0.0,
            "reasoning_summary": "No context.",
        }
        mock_llm_reason.return_value = mock_llm_response

        response = await service.answer_question(mock_req)

        assert response.answer == "I don't know."
        assert response.reasoningPath["records"] == []
