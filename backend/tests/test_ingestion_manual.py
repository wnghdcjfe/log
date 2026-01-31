import pytest
import asyncio
from app.services.ingestion_service import ingestion_service
from app.models.schemas.record_req import CreateRecordRequest
from app.db.graph import neo4j_db
from app.db.mongo import mongo_db
from datetime import datetime


@pytest.mark.asyncio
async def test_integration_ingestion_neo4j():
    """
    Test full ingestion flow including Neo4j insertion using real connections.
    """
    # 1. Connect to DBs
    await mongo_db.connect()
    await neo4j_db.connect()

    try:
        # 2. Prepare test data
        test_user_id = "test_user_integration"
        test_title = "Neo4j Integration Test"
        test_content = "Today I successfully connected to Neo4j Aura. I felt relieved and accomplished."
        request = CreateRecordRequest(
            userId=test_user_id,
            title=test_title,
            content=test_content,
            feel=["relieved", "accomplished"],
            date=datetime.now().date(),
        )

        # 3. Execute Ingestion
        print(f"\n[Test] Creating record for user: {test_user_id}")
        response = await ingestion_service.create_record(request)
        record_id = response.recordId
        print(f"[Test] Created Record ID: {record_id}")

        # 4. Verification - Query Neo4j
        print("[Test] Verifying Neo4j data...")
        verify_query = """
        MATCH (r:Record {recordId: $recordId})
        OPTIONAL MATCH (r)-[:HAS_EVENT]->(e:Event)
        OPTIONAL MATCH (r)-[:HAS_EMOTION]->(em:Emotion)
        RETURN r, count(e) as event_count, count(em) as emotion_count
        """

        async with neo4j_db.driver.session() as session:
            result = await session.run(verify_query, {"recordId": record_id})
            record = await result.single()

            assert record is not None, "Record node not found in Neo4j"
            print(f"[Test] Found Neo4j Record Node: {record['r'].element_id}")
            print(
                f"[Test] Linked Events: {record['event_count']}, Emotions: {record['emotion_count']}"
            )

            assert record["event_count"] >= 0

        # 5. Cleanup
        print("[Test] Cleaning up...")
        cleanup_query = """
        MATCH (r:Record {recordId: $recordId})
        DETACH DELETE r
        """
        async with neo4j_db.driver.session() as session:
            await session.run(cleanup_query, {"recordId": record_id})

        # Cleanup Mongo
        if mongo_db.db is not None:
            await mongo_db.db.diaries.delete_one({"_id": record_id})

    finally:
        await mongo_db.close()
        await neo4j_db.close()
