from typing import List, Dict, Any
from datetime import datetime, timedelta
import math
from app.db.mongo import mongo_db
from app.core.config import get_settings

settings = get_settings()

# RRF 상수: 순위 기반 융합에서 사용되는 smoothing 파라미터
RRF_K = 60

# Time Decay 상수
TIME_DECAY_HALF_LIFE_DAYS = 30  # 30일이 지나면 가중치가 절반으로 감소


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
    def _calculate_time_decay(doc_date: Any, half_life_days: int = TIME_DECAY_HALF_LIFE_DAYS) -> float:
        """
        시간 감쇠 가중치 계산 (Exponential Decay).

        공식: decay = 2^(-days_ago / half_life)
        - half_life_days가 지나면 가중치가 0.5가 됨
        - 최신 문서일수록 1.0에 가까움
        - 아주 오래된 문서도 최소 0.1의 가중치는 유지

        Args:
            doc_date: 문서의 날짜 (datetime, str, 또는 None)
            half_life_days: 가중치가 절반이 되는 일수

        Returns:
            0.1 ~ 1.0 사이의 가중치
        """
        if doc_date is None:
            return 0.5  # 날짜 정보가 없으면 중간 가중치

        try:
            # 다양한 날짜 형식 처리
            if isinstance(doc_date, datetime):
                record_date = doc_date
            elif isinstance(doc_date, str):
                # ISO 형식 파싱 시도
                try:
                    record_date = datetime.fromisoformat(doc_date.replace("Z", "+00:00"))
                except ValueError:
                    # 다른 형식 시도 (YYYY-MM-DD)
                    record_date = datetime.strptime(doc_date[:10], "%Y-%m-%d")
            else:
                return 0.5

            # 현재 시간과의 차이 계산
            now = datetime.now(record_date.tzinfo) if record_date.tzinfo else datetime.now()
            days_ago = (now - record_date).days

            if days_ago < 0:
                days_ago = 0  # 미래 날짜는 현재로 처리

            # Exponential decay: 2^(-days_ago / half_life)
            decay = math.pow(2, -days_ago / half_life_days)

            # 최소 가중치 0.1 보장
            return max(0.1, decay)

        except Exception as e:
            print(f"[Time Decay] Error calculating decay: {e}")
            return 0.5

    @staticmethod
    def _apply_time_decay(
        documents: List[Dict[str, Any]],
        time_weight: float = 0.3,
    ) -> List[Dict[str, Any]]:
        """
        검색 결과에 시간 감쇠 가중치를 적용.

        최종 점수 = (1 - time_weight) * original_score + time_weight * time_decay

        Args:
            documents: 검색 결과 문서 리스트
            time_weight: 시간 가중치의 영향력 (0.0~1.0, 기본 0.3)

        Returns:
            시간 가중치가 적용된 문서 리스트 (점수순 정렬)
        """
        if not documents:
            return []

        for doc in documents:
            original_score = doc.get("score", 0.0)
            doc_date = doc.get("date") or doc.get("createdAt")
            time_decay = VectorDB._calculate_time_decay(doc_date)

            # 최종 점수 계산: 원래 점수와 시간 가중치의 가중 평균
            final_score = (1 - time_weight) * original_score + time_weight * time_decay

            doc["_original_score"] = original_score
            doc["_time_decay"] = time_decay
            doc["score"] = final_score

        # 최종 점수로 재정렬
        documents.sort(key=lambda x: x.get("score", 0), reverse=True)

        return documents

    @staticmethod
    async def search(
        query_vector: list,
        user_id: str,
        top_k: int = 5,
        query_text: str = None,
        use_hybrid: bool = True,
        vector_weight: float = 0.5,
        text_weight: float = 0.5,
        use_time_decay: bool = True,
        time_decay_weight: float = 0.3,
    ) -> List[Dict[str, Any]]:
        """
        하이브리드 검색: 벡터 검색과 텍스트 검색을 결합하고 시간 가중치 적용.

        Args:
            query_vector: 쿼리 임베딩 벡터
            user_id: 사용자 ID
            top_k: 반환할 결과 수
            query_text: 텍스트 검색용 쿼리 (하이브리드 검색 시 필요)
            use_hybrid: 하이브리드 검색 사용 여부 (False면 벡터 검색만)
            vector_weight: 벡터 검색 가중치 (기본 0.5)
            text_weight: 텍스트 검색 가중치 (기본 0.5)
            use_time_decay: 시간 감쇠 적용 여부 (기본 True)
            time_decay_weight: 시간 가중치의 영향력 (0.0~1.0, 기본 0.3)

        Returns:
            검색 결과 리스트 (최종 점수로 정렬됨)
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
            results = vector_results[:top_k]
        else:
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
                results = vector_results[:top_k]
                text_results = None

            if text_results is not None:
                # RRF로 결과 융합
                fused_results = VectorDB._reciprocal_rank_fusion(
                    vector_results, text_results, vector_weight, text_weight
                )
                print(f"[Hybrid Search] After RRF fusion: {len(fused_results)} unique results")
                results = fused_results[:top_k]

        # Time Decay 적용
        if use_time_decay and results:
            results = VectorDB._apply_time_decay(results, time_decay_weight)
            print(f"[Time Decay] Applied with weight {time_decay_weight}")

        return results


vector_db = VectorDB()
