import asyncio
from app.services.ingestion_service import ingestion_service
from app.models.schemas.record_req import CreateRecordRequest
from app.db.graph import neo4j_db
from app.db.mongo import mongo_db
from datetime import datetime


async def insert_debug_data():
    print("Connecting to databases...")
    await mongo_db.connect()
    await neo4j_db.connect()

    try:
        current_time = datetime.now()
        date_str = current_time.strftime("%Y-%m-%d %H:%M:%S")

        test_user_id = "debug_user"
        test_title = f"Data Persistence Check - {date_str}"
        test_content = "This record is created to verify that data persists in Neo4j Aura. If you see this in the graph, it works!"

        request = CreateRecordRequest(
            userId=test_user_id,
            title=test_title,
            content=test_content,
            feel=["curious", "hopeful"],
            date=current_time.date(),
        )

        print(f"\nCreating record for user: {test_user_id}")
        response = await ingestion_service.create_record(request)
        record_id = response.recordId

        print(f"\n✅ Record created successfully!")
        print(f"Record ID: {record_id}")
        print(f"User ID: {test_user_id}")
        print("\nGo to your Neo4j Console and run this query to see the data:")
        print(
            f"MATCH (n) WHERE n.recordId = '{record_id}' OR n.userId = '{test_user_id}' RETURN n"
        )

    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        await mongo_db.close()
        await neo4j_db.close()


if __name__ == "__main__":
    asyncio.run(insert_debug_data())
