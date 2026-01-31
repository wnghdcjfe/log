from fastapi import APIRouter, HTTPException
from app.models.schemas.question_req import QuestionRequest, QuestionResponse
from app.services.reasoning_service import reasoning_service

router = APIRouter()


@router.post("", response_model=QuestionResponse)
async def ask_question(request: QuestionRequest):
    """
    Ask a question based on personal memories (Vector + Graph RAG).
    """
    try:
        response = await reasoning_service.answer_question(request)
        return response
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
