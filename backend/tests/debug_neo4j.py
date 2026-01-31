"""
Neo4j 그래프 데이터 확인 스크립트
"""

import asyncio
from neo4j import AsyncGraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")


async def test_neo4j():
    """Neo4j 연결 및 데이터 확인"""
    print(f"🔌 Neo4j 연결 테스트...")
    print(f"URI: {NEO4J_URI}")
    print(f"User: {NEO4J_USER}")

    driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    async with driver.session() as session:
        # 전체 노드 수 확인
        result = await session.run("MATCH (n) RETURN count(n) as count")
        record = await result.single()
        total_nodes = record["count"]
        print(f"\n📊 전체 노드 수: {total_nodes}")

        # 노드 타입별 개수
        result = await session.run(
            """
            MATCH (n)
            RETURN labels(n) as labels, count(n) as count
            ORDER BY count DESC
        """
        )
        records = [record async for record in result]
        print(f"\n📊 노드 타입별 개수:")
        for record in records:
            print(f"  - {record['labels']}: {record['count']}")

        # test_user_123의 데이터 확인
        result = await session.run(
            """
            MATCH (r:Record {userId: $userId})
            RETURN r.recordId as recordId, r.date as date, r.createdAt as createdAt
            ORDER BY r.createdAt DESC
            LIMIT 5
        """,
            userId="test_user_123",
        )
        records = [record async for record in result]

        print(f"\n📝 test_user_123의 Record 노드 ({len(records)}개):")
        for record in records:
            print(f"  - RecordID: {record['recordId']}")
            print(f"    Date: {record['date']}")
            print(f"    CreatedAt: {record['createdAt']}")

        # test_user_123의 관계 확인
        result = await session.run(
            """
            MATCH (r:Record {userId: $userId})-[rel]->(n)
            RETURN r.recordId as recordId, type(rel) as relType, labels(n) as targetLabel, n
            LIMIT 10
        """,
            userId="test_user_123",
        )
        records = [record async for record in result]

        print(f"\n🔗 test_user_123의 관계 ({len(records)}개):")
        for record in records:
            print(
                f"  - Record {record['recordId']} -> [{record['relType']}] -> {record['targetLabel']}"
            )
            node_props = dict(record["n"])
            print(f"    속성: {node_props}")

        # 전체 관계 수
        result = await session.run("MATCH ()-[r]->() RETURN count(r) as count")
        record = await result.single()
        total_rels = record["count"]
        print(f"\n🔗 전체 관계 수: {total_rels}")

    await driver.close()
    print(f"\n✅ Neo4j 테스트 완료")


if __name__ == "__main__":
    asyncio.run(test_neo4j())
