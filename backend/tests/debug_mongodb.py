"""
MongoDB와 Vector Search 테스트를 위한 스크립트
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "outbrain")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "diaries")


async def test_mongodb_connection():
    """MongoDB 연결 및 데이터 확인"""
    print(f"🔌 MongoDB 연결 테스트...")
    print(f"URI: {MONGODB_URI[:50]}...")
    print(f"Database: {DATABASE_NAME}")
    print(f"Collection: {COLLECTION_NAME}")

    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    collection = db[COLLECTION_NAME]

    # 전체 문서 수 확인
    total_count = await collection.count_documents({})
    print(f"\n📊 전체 문서 수: {total_count}")

    # test_user_123의 문서 확인
    user_docs = await collection.count_documents({"userId": "test_user_123"})
    print(f"📊 test_user_123 문서 수: {user_docs}")

    # 최근 문서 확인
    recent_docs = (
        await collection.find({"userId": "test_user_123"})
        .sort("_id", -1)
        .limit(3)
        .to_list(length=3)
    )

    print(f"\n📝 최근 문서 ({len(recent_docs)}개):")
    for i, doc in enumerate(recent_docs, 1):
        print(f"\n[{i}] RecordID: {doc.get('recordId', 'N/A')}")
        print(f"    Title: {doc.get('title', 'N/A')}")
        print(f"    Content: {doc.get('content', 'N/A')[:50]}...")
        print(f"    Date: {doc.get('date', 'N/A')}")
        print(f"    Has Embedding: {bool(doc.get('embedding'))}")
        if doc.get("embedding"):
            print(f"    Embedding Length: {len(doc['embedding'])}")

    # 인덱스 확인
    print(f"\n🔍 컬렉션 인덱스:")
    indexes = await collection.list_indexes().to_list(length=100)
    for idx in indexes:
        print(f"  - {idx.get('name')}: {idx.get('key', {})}")

    await client.close()
    print(f"\n✅ MongoDB 테스트 완료")


if __name__ == "__main__":
    asyncio.run(test_mongodb_connection())
