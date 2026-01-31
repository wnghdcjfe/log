from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from app.models.schemas.record_req import RecordResponse, UpdateRecordRequest
from app.db.mongo import mongo_db
from app.core.config import get_settings

settings = get_settings()


class RecordService:
    @staticmethod
    def _doc_to_response(doc: dict) -> RecordResponse:
        feel = doc.get("feel") or []
        date_str = doc.get("date") or ""
        return RecordResponse(
            id=str(doc["_id"]),
            title=doc.get("title", ""),
            content=doc.get("content", ""),
            feel=feel if isinstance(feel, list) else [],
            date=date_str,
            userId=doc.get("userId", "default"),
        )

    @staticmethod
    async def list_records(user_id: Optional[str] = None) -> List[RecordResponse]:
        if mongo_db.db is None:
            raise Exception("Database connection not established")
        collection = mongo_db.db[settings.COLLECTION_NAME]
        query = {"deletedAt": None}
        if user_id:
            query["userId"] = user_id
        cursor = collection.find(query).sort("createdAt", -1)
        results = []
        async for doc in cursor:
            results.append(RecordService._doc_to_response(doc))
        return results

    @staticmethod
    async def get_record(record_id: str) -> Optional[RecordResponse]:
        if mongo_db.db is None:
            raise Exception("Database connection not established")
        if not ObjectId.is_valid(record_id):
            return None
        collection = mongo_db.db[settings.COLLECTION_NAME]
        doc = await collection.find_one(
            {"_id": ObjectId(record_id), "deletedAt": None}
        )
        if not doc:
            return None
        return RecordService._doc_to_response(doc)

    @staticmethod
    async def update_record(
        record_id: str, request: UpdateRecordRequest
    ) -> Optional[RecordResponse]:
        if mongo_db.db is None:
            raise Exception("Database connection not established")
        if not ObjectId.is_valid(record_id):
            return None
        collection = mongo_db.db[settings.COLLECTION_NAME]
        doc = await collection.find_one(
            {"_id": ObjectId(record_id), "deletedAt": None}
        )
        if not doc:
            return None
        update: dict = {"updatedAt": datetime.now()}
        if request.title is not None:
            update["title"] = request.title
        if request.content is not None:
            update["content"] = request.content
        if request.feel is not None:
            update["feel"] = request.feel
        if request.date is not None:
            update["date"] = request.date.isoformat()
        result = await collection.find_one_and_update(
            {"_id": ObjectId(record_id), "deletedAt": None},
            {"$set": update},
            return_document=True,
        )
        if not result:
            return None
        return RecordService._doc_to_response(result)

    @staticmethod
    async def delete_record(record_id: str) -> bool:
        if mongo_db.db is None:
            raise Exception("Database connection not established")
        if not ObjectId.is_valid(record_id):
            return False
        collection = mongo_db.db[settings.COLLECTION_NAME]
        result = await collection.find_one_and_update(
            {"_id": ObjectId(record_id), "deletedAt": None},
            {"$set": {"deletedAt": datetime.now()}},
        )
        return result is not None


record_service = RecordService()
