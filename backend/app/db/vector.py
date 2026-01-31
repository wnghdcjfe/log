from typing import List, Dict, Any
from app.db.mongo import mongo_db
from app.core.config import get_settings

settings = get_settings()

# RRF 상수: 순위 기반 융합에서 사용되는 smoothing 파라미터
RRF_K = 60


class VectorDB:
    """
    Abstraction for Vector Database operations.
    Using MongoDB Atlas Vector Search with Hybrid Search support.

    Assumptions:
    - Collection 'records' has a vector search index named 'vector_index' created in Atlas.
    - Collection 'records' has a text search index named 'text_index' created in Atlas.
    """

    @staticmethod
    async def insert_vector(record_id: str, vector: list):
        """
        In Atlas Vector Search, you typically store the vector directly in the document.
        So this method might just update the existing record with the vector field.
        """
        if mongo_db.db is None:
            raise Exception("Database not connected")

        collection = mongo_db.db[settings.COLLECTION_NAME]
        await collection.update_one(
            {"recordId": record_id}, {"$set": {"embedding": vector}}
        )

    @staticmethod
    async def _vector_search(
        collection, query_vector: list, user_id: str, top_k: int
    ) -> List[Dict[str, Any]]:
        """
        벡터 유사도 기반 검색 (Semantic Search)
        """
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "filter": {"userId": {"$eq": user_id}},
                    "queryVector": query_vector,
                    "numCandidates": top_k * 10,
                    "limit": top_k,
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "recordId": 1,
                    "content": 1,
                    "title": 1,
                    "date": 1,
                    "createdAt": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]
        return await collection.aggregate(pipeline).to_list(length=top_k)

    @staticmethod
    async def _text_search(
        collection, query_text: str, user_id: str, top_k: int
    ) -> List[Dict[str, Any]]:
        """
        키워드 기반 텍스트 검색 (BM25-like via Atlas Search)
        """
        pipeline = [
            {
                "$search": {
                    "index": "text_index",
                    "compound": {
                        "must": [
                            {
                                "text": {
                                    "query": query_text,
                                    "path": ["title", "content"],
                                    "fuzzy": {"maxEdits": 1},
                                }
                            }
                        ],
                        "filter": [{"equals": {"path": "userId", "value": user_id}}],
                    },
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "recordId": 1,
                    "content": 1,
                    "title": 1,
                    "date": 1,
                    "createdAt": 1,
                    "score": {"$meta": "searchScore"},
                }
            },
            {"$limit": top_k},
        ]
        return await collection.aggregate(pipeline).to_list(length=top_k)

    @staticmethod
    def _reciprocal_rank_fusion(
        vector_results: List[Dict[str, Any]],
        text_results: List[Dict[str, Any]],
        vector_weight: float = 0.5,
        text_weight: float = 0.5,
    ) -> List[Dict[str, Any]]:
        """
        RRF (Reciprocal Rank Fusion)를 사용하여 두 검색 결과를 통합.

        RRF Score = weight * (1 / (k + rank))
        - k: smoothing 상수 (기본값 60)
        - rank: 검색 결과에서의 순위 (1부터 시작)
        """
        rrf_scores: Dict[str, float] = {}
        doc_map: Dict[str, Dict[str, Any]] = {}

        # 벡터 검색 결과 RRF 점수 계산
        for rank, doc in enumerate(vector_results, start=1):
            doc_id = str(doc["_id"])
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + vector_weight * (
                1 / (RRF_K + rank)
            )
            doc_map[doc_id] = doc

        # 텍스트 검색 결과 RRF 점수 계산
        for rank, doc in enumerate(text_results, start=1):
            doc_id = str(doc["_id"])
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + text_weight * (
                1 / (RRF_K + rank)
            )
            if doc_id not in doc_map:
                doc_map[doc_id] = doc

        # RRF 점수로 정렬
        sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)

        # 결과 구성 (RRF 점수를 score 필드에 저장)
        results = []
        for doc_id in sorted_ids:
            doc = doc_map[doc_id].copy()
            doc["score"] = rrf_scores[doc_id]
            doc["_rrf_score"] = rrf_scores[doc_id]  # 디버깅용
            results.append(doc)

        return results

    @staticmethod
    async def search(
        query_vector: list,
        user_id: str,
        top_k: int = 5,
        query_text: str = None,
        use_hybrid: bool = True,
        vector_weight: float = 0.5,
        text_weight: float = 0.5,
    ) -> List[Dict[str, Any]]:
        """
        하이브리드 검색: 벡터 검색과 텍스트 검색을 결합.

        Args:
            query_vector: 쿼리 임베딩 벡터
            user_id: 사용자 ID
            top_k: 반환할 결과 수
            query_text: 텍스트 검색용 쿼리 (하이브리드 검색 시 필요)
            use_hybrid: 하이브리드 검색 사용 여부 (False면 벡터 검색만)
            vector_weight: 벡터 검색 가중치 (기본 0.5)
            text_weight: 텍스트 검색 가중치 (기본 0.5)

        Returns:
            검색 결과 리스트 (RRF 점수로 정렬됨)
        """
        if mongo_db.db is None:
            raise Exception("Database not connected")

        collection = mongo_db.db[settings.COLLECTION_NAME]

        # 벡터 검색 실행
        vector_results = await VectorDB._vector_search(
            collection, query_vector, user_id, top_k * 2  # 융합을 위해 더 많이 가져옴
        )

        # 하이브리드 검색이 비활성화되었거나 텍스트 쿼리가 없으면 벡터 검색만 반환
        if not use_hybrid or not query_text:
            print(f"[Hybrid Search] Vector-only mode, found {len(vector_results)} results")
            return vector_results[:top_k]

        # 텍스트 검색 실행
        try:
            text_results = await VectorDB._text_search(
                collection, query_text, user_id, top_k * 2
            )
            print(
                f"[Hybrid Search] Vector: {len(vector_results)}, Text: {len(text_results)} results"
            )
        except Exception as e:
            # 텍스트 인덱스가 없으면 벡터 검색만 사용
            print(f"[Hybrid Search] Text search failed ({e}), falling back to vector-only")
            return vector_results[:top_k]

        # RRF로 결과 융합
        fused_results = VectorDB._reciprocal_rank_fusion(
            vector_results, text_results, vector_weight, text_weight
        )

        print(f"[Hybrid Search] After RRF fusion: {len(fused_results)} unique results")
        return fused_results[:top_k]


vector_db = VectorDB()
