from datetime import datetime
from typing import List

from app.models.schemas.record_req import CreateRecordRequest, CreateRecordResponse
from app.models.domain.record import Record
from app.core.config import get_settings
from app.db.mongo import mongo_db

settings = get_settings()
from app.db.graph import neo4j_db
from app.services.llm_service import llm_service


class IngestionService:

    @staticmethod
    async def create_record(request: CreateRecordRequest) -> CreateRecordResponse:
        # 1. 임베딩을 위한 컨텐츠 준비 (제목 + 내용 + 기분)
        combined_text = f"{request.title} {request.content}"

        # 2. 임베딩 생성
        embedding = await llm_service.get_embedding(combined_text)

        # 3. 도메인 모델 생성
        record = Record(
            userId=request.userId,
            title=request.title,
            content=request.content,
            feel=request.feel,
            date=request.date.isoformat(),
            createdAt=datetime.now(),
            embedding=embedding,
        )

        # 4. MongoDB 저장
        if not mongo_db.db:
            raise Exception("Database connection not established")

        collection = mongo_db.db[settings.COLLECTION_NAME]
        result = await collection.insert_one(record.model_dump(by_alias=True))

        # 5. Graph DB를 위한 Cypher 쿼리 생성
        # 실제 운영 환경에서는 백그라운드 비동기 작업으로 처리 가능
        cypher_query = await llm_service.generate_graph_cypher(
            text=combined_text,
            user_id=request.userId,
            record_id=str(result.inserted_id),
            date=request.date.isoformat(),
        )

        # 6. Cypher 쿼리 실행
        if cypher_query:
            await neo4j_db.execute_cypher(cypher_query)

        return CreateRecordResponse(recordId=str(result.inserted_id))


ingestion_service = IngestionService()
