import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from bson import ObjectId
from app.db.vector import VectorDB, RRF_K, TIME_DECAY_HALF_LIFE_DAYS


@pytest.mark.asyncio
async def test_insert_vector_success():
    db = VectorDB()

    with patch("app.db.vector.mongo_db") as mock_mongo:
        mock_collection = AsyncMock()
        mock_mongo.db.__getitem__.return_value = mock_collection

        await db.insert_vector("rec1", [0.1, 0.2])

        mock_collection.update_one.assert_awaited_once_with(
            {"recordId": "rec1"}, {"$set": {"embedding": [0.1, 0.2]}}
        )


@pytest.mark.asyncio
async def test_search_success():
    db = VectorDB()

    with patch("app.db.vector.mongo_db") as mock_mongo:
        mock_collection = (
            MagicMock()
        )  # Changed to MagicMock for sync aggregation access
        mock_mongo.db.__getitem__.return_value = mock_collection

        # Mock aggregation chain
        mock_cursor = AsyncMock()
        mock_cursor.to_list.return_value = [{"recordId": "r1", "score": 0.9}]

        # aggregate returns cursor synchronously
        mock_collection.aggregate.return_value = mock_cursor

        # Since mongo_db is patched on the module, mongo_db.db is accessed.
        # mongo_db.db is access via property/attr usually?
        # In snippet: mongo_db.db[settings.COLLECTION_NAME]
        # mock_mongo.db is a MagicMock (default).
        # mock_mongo.db.__getitem__ returns mock_collection.

        results = await db.search([0.1], "user1", top_k=2)

        assert len(results) == 1
        assert results[0]["recordId"] == "r1"

        # Verify pipeline structure vaguely
        args = mock_collection.aggregate.call_args[0][0]
        assert len(args) == 2
        assert "$vectorSearch" in args[0]
        assert args[0]["$vectorSearch"]["index"] == "vector_index"


@pytest.mark.asyncio
async def test_search_no_db_connection():
    db = VectorDB()
    with patch("app.db.vector.mongo_db") as mock_mongo:
        mock_mongo.db = None

        with pytest.raises(Exception) as exc:
            await db.search([0.1], "user1")
        assert "Database not connected" in str(exc.value)


# ============== RRF (Reciprocal Rank Fusion) 테스트 ==============

def test_rrf_fusion_combines_results():
    """RRF가 두 검색 결과를 올바르게 결합하는지 테스트"""
    vector_results = [
        {"_id": ObjectId(), "recordId": "r1", "score": 0.9},
        {"_id": ObjectId(), "recordId": "r2", "score": 0.8},
    ]
    text_results = [
        {"_id": vector_results[1]["_id"], "recordId": "r2", "score": 0.95},  # r2가 텍스트에서 1위
        {"_id": ObjectId(), "recordId": "r3", "score": 0.7},
    ]

    fused = VectorDB._reciprocal_rank_fusion(vector_results, text_results)

    # r2가 양쪽에서 높은 순위이므로 최상위에 있어야 함
    assert len(fused) == 3  # 중복 제거됨
    record_ids = [r["recordId"] for r in fused]
    assert "r1" in record_ids
    assert "r2" in record_ids
    assert "r3" in record_ids


def test_rrf_fusion_with_weights():
    """RRF 가중치가 결과에 영향을 미치는지 테스트"""
    id1, id2 = ObjectId(), ObjectId()
    vector_results = [{"_id": id1, "recordId": "r1", "score": 0.9}]
    text_results = [{"_id": id2, "recordId": "r2", "score": 0.9}]

    # 벡터 가중치 높음
    fused_vector = VectorDB._reciprocal_rank_fusion(
        vector_results, text_results, vector_weight=0.9, text_weight=0.1
    )
    # 텍스트 가중치 높음
    fused_text = VectorDB._reciprocal_rank_fusion(
        vector_results, text_results, vector_weight=0.1, text_weight=0.9
    )

    # 가중치에 따라 순위가 달라져야 함
    assert fused_vector[0]["recordId"] == "r1"  # 벡터 우선
    assert fused_text[0]["recordId"] == "r2"  # 텍스트 우선


# ============== Time Decay 테스트 ==============

def test_time_decay_recent_document():
    """최신 문서는 높은 가중치를 받는지 테스트"""
    today = datetime.now().isoformat()
    decay = VectorDB._calculate_time_decay(today)
    assert decay > 0.9  # 오늘 문서는 거의 1.0


def test_time_decay_old_document():
    """오래된 문서는 낮은 가중치를 받는지 테스트"""
    old_date = (datetime.now() - timedelta(days=90)).isoformat()
    decay = VectorDB._calculate_time_decay(old_date)
    assert decay < 0.5  # 90일 지난 문서는 0.5 미만


def test_time_decay_half_life():
    """half_life 기간 후 가중치가 약 0.5인지 테스트"""
    half_life_ago = (datetime.now() - timedelta(days=TIME_DECAY_HALF_LIFE_DAYS)).isoformat()
    decay = VectorDB._calculate_time_decay(half_life_ago)
    assert 0.45 < decay < 0.55  # 약 0.5


def test_time_decay_minimum():
    """아주 오래된 문서도 최소 가중치를 유지하는지 테스트"""
    very_old = (datetime.now() - timedelta(days=365)).isoformat()
    decay = VectorDB._calculate_time_decay(very_old)
    assert decay >= 0.1  # 최소 가중치 보장


def test_time_decay_none_date():
    """날짜가 None이면 기본 가중치를 반환하는지 테스트"""
    decay = VectorDB._calculate_time_decay(None)
    assert decay == 0.5  # 기본 가중치


def test_apply_time_decay_reorders():
    """Time decay가 결과 순서를 재정렬하는지 테스트"""
    today = datetime.now().isoformat()
    old_date = (datetime.now() - timedelta(days=60)).isoformat()

    docs = [
        {"_id": ObjectId(), "content": "old", "date": old_date, "score": 0.9},
        {"_id": ObjectId(), "content": "new", "date": today, "score": 0.85},
    ]

    # 높은 time_weight로 최신 문서 우선
    result = VectorDB._apply_time_decay(docs.copy(), time_weight=0.5)

    # 최신 문서가 더 높은 최종 점수를 가져야 함
    assert result[0]["content"] == "new"


# ============== Hybrid Search 통합 테스트 ==============

@pytest.mark.asyncio
async def test_hybrid_search_with_time_decay():
    """Hybrid search + Time decay가 함께 동작하는지 테스트"""
    db = VectorDB()

    with patch("app.db.vector.mongo_db") as mock_mongo:
        mock_collection = MagicMock()
        mock_mongo.db.__getitem__.return_value = mock_collection

        today = datetime.now().isoformat()
        old_date = (datetime.now() - timedelta(days=60)).isoformat()

        # 벡터 검색 결과
        mock_vector_cursor = AsyncMock()
        mock_vector_cursor.to_list.return_value = [
            {"_id": ObjectId(), "recordId": "r1", "content": "old", "date": old_date, "score": 0.95},
            {"_id": ObjectId(), "recordId": "r2", "content": "new", "date": today, "score": 0.85},
        ]

        mock_collection.aggregate.return_value = mock_vector_cursor

        # Vector-only 모드로 테스트 (텍스트 검색 없이)
        results = await db.search(
            query_vector=[0.1, 0.2],
            user_id="user1",
            top_k=5,
            use_hybrid=False,
            use_time_decay=True,
            time_decay_weight=0.5,
        )

        assert len(results) == 2
        # Time decay로 인해 최신 문서가 상위로 올라갈 수 있음
        assert "_time_decay" in results[0]
        assert "_original_score" in results[0]
