from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_settings

settings = get_settings()


class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect(cls):
        if cls.client is None:
            cls.client = AsyncIOMotorClient(settings.MONGODB_URI)
            cls.db = cls.client[settings.DATABASE_NAME]
            print("Connected to MongoDB")

    @classmethod
    async def close(cls):
        if cls.client:
            cls.client.close()
            cls.client = None
            print("Closed MongoDB Connection")


mongo_db = MongoDB()
