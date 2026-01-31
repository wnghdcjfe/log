from typing import List, Optional
from app.db.vector import vector_db
from app.db.graph import neo4j_db
from app.services.llm_service import llm_service
from app.models.schemas.question_req import QuestionRequest, QuestionResponse


class ReasoningService:

    @staticmethod
    async def answer_question(request: QuestionRequest) -> QuestionResponse:
        """
        Orchestrate the RAG process:
        1. Embed question
        2. Vector Search (Top-K records)
        3. Graph Traversal (Context Expansion around records)
        4. LLM Reasoning (Syntehsize answer)
        """

        # 1. Embed Question
        query_embedding = await llm_service.get_embedding(request.text)

        # 2. Hybrid Search (Vector + Text)
        # 벡터 검색(의미 기반)과 텍스트 검색(키워드 기반)을 결합하여 검색 품질 향상
        vector_results = await vector_db.search(
            query_vector=query_embedding,
            user_id=request.userId,
            top_k=5,
            query_text=request.text,  # 하이브리드 검색을 위한 원본 텍스트
            use_hybrid=True,
            vector_weight=0.5,
            text_weight=0.5,
        )

        # Use MongoDB _id for frontend compatibility
        record_ids = [str(res["_id"]) for res in vector_results if "_id" in res]
        print(f"[DEBUG] Vector search found {len(vector_results)} records")
        print(f"[DEBUG] Record IDs (MongoDB _id): {record_ids}")

        # 3. Graph Retrieval (Context Subgraph)
        graph_context = await neo4j_db.get_context_subgraph(
            user_id=request.userId,
            record_ids=record_ids,
            hop=1,  # Start with 1-hop for speed
        )

        print(
            f"[DEBUG] Graph context - Nodes: {len(graph_context.get('nodes', []))}, Edges: {len(graph_context.get('edges', []))}"
        )

        # 4. LLM Reasoning
        llm_response = await llm_service.generate_answer_with_reasoning(
            question=request.text,
            context_records=vector_results,
            context_graph=graph_context,
        )

        # 5. Construct Response
        return QuestionResponse(
            answer=llm_response.get("answer", "I couldn't generate an answer."),
            confidence=llm_response.get("confidence", 0.0),
            reasoningPath={
                "summary": llm_response.get("reasoning_summary", ""),
                "records": record_ids,
                "graph_snapshot": {
                    "node_count": len(graph_context.get("nodes", [])),
                    "edge_count": len(graph_context.get("edges", [])),
                },
            },
        )


reasoning_service = ReasoningService()
