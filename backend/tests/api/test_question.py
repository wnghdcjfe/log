import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.schemas.question_req import QuestionResponse
from app.api.v1.endpoints import question


@pytest.mark.asyncio
async def test_ask_question_success(monkeypatch):
    # Mock return value
    mock_response = QuestionResponse(
        answer="Users answer",
        confidence=0.9,
        reasoningPath={"summary": "sum", "records": [], "graph_snapshot": {}},
    )

    async def mock_answer_question(request):
        return mock_response

    monkeypatch.setattr(
        question.reasoning_service, "answer_question", mock_answer_question
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        payload = {"text": "What?", "userId": "u1"}
        response = await ac.post("/api/v1/question", json=payload)

    assert response.status_code == 200
    assert response.json()["answer"] == "Users answer"


@pytest.mark.asyncio
async def test_ask_question_failure(monkeypatch):
    async def mock_fail(request):
        raise Exception("Service Error")

    monkeypatch.setattr(question.reasoning_service, "answer_question", mock_fail)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        payload = {"text": "What?", "userId": "u1"}
        response = await ac.post("/api/v1/question", json=payload)

    assert response.status_code == 500
    assert "Service Error" in response.json()["detail"]
