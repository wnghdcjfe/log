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
        2. Hybrid Search (Vector + Text with RRF) + Time Decay
        3. Reranking (LLM-based relevance scoring)
        4. Graph Traversal (Context Expansion around records)
        5. LLM Reasoning (Synthesize answer)
        """

        # 1. Embed Question
        query_embedding = await llm_service.get_embedding(request.text)

        # 2. Hybrid Search (Vector + Text) with Time Decay
        # - 벡터 검색(의미 기반)과 텍스트 검색(키워드 기반)을 RRF로 결합
        # - 시간 감쇠(Time Decay)로 최신 기록에 가중치 부여
        # - Reranking을 위해 더 많은 후보를 가져옴
        initial_results = await vector_db.search(
            query_vector=query_embedding,
            user_id=request.userId,
            top_k=10,  # Reranking을 위해 더 많이 가져옴
            query_text=request.text,
            use_hybrid=True,
            vector_weight=0.5,
            text_weight=0.5,
            use_time_decay=True,  # 최신 기록 우선
            time_decay_weight=0.3,  # 시간 가중치 30%
        )

        print(f"[DEBUG] Hybrid search (with time decay) found {len(initial_results)} candidates")

        # 3. Reranking (LLM-based)
        # 초기 검색 결과를 질문과의 관련성에 따라 재순위화
        reranked_results = await llm_service.rerank(
            query=request.text,
            documents=initial_results,
            top_k=5,  # 최종 사용할 문서 수
        )

        print(f"[DEBUG] After reranking: {len(reranked_results)} documents selected")

        # MongoDB _id: 프론트엔드 호환용
        mongo_ids = [str(res["_id"]) for res in reranked_results if "_id" in res]
        # recordId: Neo4j 그래프 조회용 (UUID)
        record_ids = [res["recordId"] for res in reranked_results if "recordId" in res]

        print(f"[DEBUG] MongoDB IDs: {mongo_ids}")
        print(f"[DEBUG] Record IDs (for Neo4j): {record_ids}")

        # 4. Graph Retrieval (Context Subgraph)
        # Neo4j에서는 recordId (UUID)를 사용하여 그래프 조회
        graph_context = await neo4j_db.get_context_subgraph(
            user_id=request.userId,
            record_ids=record_ids,  # recordId 사용
            hop=1,  # Start with 1-hop for speed
        )

        print(
            f"[DEBUG] Graph context - Nodes: {len(graph_context.get('nodes', []))}, Edges: {len(graph_context.get('edges', []))}"
        )

        # 5. LLM Reasoning
        llm_response = await llm_service.generate_answer_with_reasoning(
            question=request.text,
            context_records=reranked_results,  # Reranked 결과 사용
            context_graph=graph_context,
        )

        # 6. Construct Response
        return QuestionResponse(
            answer=llm_response.get("answer", "I couldn't generate an answer."),
            confidence=llm_response.get("confidence", 0.0),
            reasoningPath={
                "summary": llm_response.get("reasoning_summary", ""),
                "records": mongo_ids,  # 프론트엔드 호환용 MongoDB _id
                "graph_snapshot": {
                    "node_count": len(graph_context.get("nodes", [])),
                    "edge_count": len(graph_context.get("edges", [])),
                },
            },
        )


reasoning_service = ReasoningService()
