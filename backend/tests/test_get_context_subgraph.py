"""
get_context_subgraph 함수 직접 테스트
"""

import asyncio
import sys
import os

# backend 디렉토리를 Python path에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.graph import neo4j_db


async def test_get_context_subgraph():
    """get_context_subgraph 함수 직접 테스트"""

    # Neo4j 연결
    await neo4j_db.connect()

    # test_user_123의 레코드 ID들
    record_ids = [
        "697e10a27766e5d6e1319d84",
        "697e10c9d18981554a2f8231",
        "697e120061e4574962cb2959",
    ]

    print(f"🔍 Testing get_context_subgraph...")
    print(f"User ID: test_user_123")
    print(f"Record IDs: {record_ids}")

    # 서브그래프 가져오기
    result = await neo4j_db.get_context_subgraph(
        user_id="test_user_123", record_ids=record_ids, hop=1
    )

    print(f"\n📊 결과:")
    print(f"노드 수: {len(result['nodes'])}")
    print(f"엣지 수: {len(result['edges'])}")

    if result["nodes"]:
        print(f"\n📝 노드 샘플 (최대 5개):")
        for i, node in enumerate(result["nodes"][:5], 1):
            print(f"\n[{i}] Labels: {node.get('_labels', [])}")
            print(f"    Properties: {node}")
    else:
        print("\n⚠️  노드가 없습니다!")

    if result["edges"]:
        print(f"\n🔗 엣지 샘플 (최대 5개):")
        for i, edge in enumerate(result["edges"][:5], 1):
            print(f"[{i}] {edge['type']}: {edge}")
    else:
        print("\n⚠️  엣지가 없습니다!")

    # Neo4j 연결 종료
    await neo4j_db.close()


if __name__ == "__main__":
    asyncio.run(test_get_context_subgraph())
