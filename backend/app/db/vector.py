from app.db.mongo import mongo_db
from app.core.config import get_settings

settings = get_settings()


class VectorDB:
    """
    Abstraction for Vector Database operations.
    Using MongoDB Atlas Vector Search.

    Assumptions:
    - Collection 'records' has a vector search index created in Atlas.
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
    async def search(query_vector: list, user_id: str, top_k: int = 5):
        """
        Perform vector search using $vectorSearch aggregation stage.
        """
        if mongo_db.db is None:
            raise Exception("Database not connected")

        collection = mongo_db.db[settings.COLLECTION_NAME]

        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",  # Ensure this index name matches Atlas config
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
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]

        results = await collection.aggregate(pipeline).to_list(length=top_k)
        return results


vector_db = VectorDB()
