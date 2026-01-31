from datetime import datetime
from typing import List

from app.models.schemas.record_req import CreateRecordRequest, CreateRecordResponse
from app.models.domain.record import Record
from app.db.mongo import mongo_db
from app.db.graph import neo4j_db
from app.services.llm_service import llm_service


class IngestionService:

    @staticmethod
    async def create_record(request: CreateRecordRequest) -> CreateRecordResponse:
        # 1. Prepare Content for Embedding (combine title + content + feel)
        combined_text = f"{request.title} {request.content}"

        # 2. Generate Embedding
        embedding = await llm_service.get_embedding(combined_text)

        # 3. Create Domain Model
        record = Record(
            userId=request.userId,
            title=request.title,
            content=request.content,
            meta={"feel": request.feel, "date": request.date.isoformat()},
            createdAt=datetime.now(),
            embedding=embedding,
        )

        # 4. Save to MongoDB
        if not mongo_db.db:
            raise Exception("Database connection not established")

        collection = mongo_db.db.records
        result = await collection.insert_one(record.model_dump(by_alias=True))

        # 5. Generate Cypher Query for Graph DB
        # This could be done asynchronously in the background in a production env
        cypher_query = await llm_service.generate_graph_cypher(
            text=combined_text,
            user_id=request.userId,
            record_id=str(result.inserted_id),
            date=request.date.isoformat(),
        )

        # 6. Execute Cypher Query
        if cypher_query:
            await neo4j_db.execute_cypher(cypher_query)

        return CreateRecordResponse(recordId=str(result.inserted_id))


ingestion_service = IngestionService()
