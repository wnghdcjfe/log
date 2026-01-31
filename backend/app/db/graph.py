from neo4j import GraphDatabase, AsyncGraphDatabase
from typing import List, Dict, Any
from app.core.config import get_settings
from app.models.domain.graph import GraphData

settings = get_settings()


class Neo4jDB:
    driver = None

    @classmethod
    async def connect(cls):
        if cls.driver is None:
            # Check if using AsyncGraphDatabase
            cls.driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI, auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            # Verify connectivity
            # await cls.driver.verify_connectivity()

            # 성능 향상을 위한 인덱스 생성
            async with cls.driver.session() as session:
                await session.run(
                    "CREATE INDEX user_record_idx IF NOT EXISTS FOR (r:Record) ON (r.userId, r.recordId)"
                )
                await session.run(
                    "CREATE INDEX user_entity_idx IF NOT EXISTS FOR (e:Event) ON (e.userId)"
                )
                await session.run(
                    "CREATE INDEX user_idx IF NOT EXISTS FOR (u:User) ON (u.userId)"
                )

            print("Connected to Neo4j and verified indexes")

    @classmethod
    async def close(cls):
        if cls.driver:
            await cls.driver.close()
            cls.driver = None
            print("Closed Neo4j Connection")

    @classmethod
    def get_session(cls):
        if cls.driver:
            return cls.driver.session()
        raise Exception("Neo4j driver not initialized")

    @classmethod
    async def execute_cypher(cls, query: str):
        """
        Execute a raw Cypher query.
        """
        if cls.driver is None:
            print("Neo4j driver is not connected.")
            return

        if not query.strip():
            print("Empty query provided.")
            return

        async with cls.driver.session() as session:
            try:
                await session.run(query)
                print(f"Executed Cypher query successfully.")
            except Exception as e:
                print(f"Failed to execute Cypher: {e}")

    @classmethod
    async def get_context_subgraph(
        cls, user_id: str, record_ids: List[str], hop: int = 2
    ) -> Dict[str, Any]:
        """
        주어진 record_ids와 연관된 서브그래프(컨텍스트)를 조회합니다.
        탐색 경로: Record -> (Event/Emotion) -> [Relationships*hop] -> Neighbors
        추론(Reasoning)에 적합한 형태의 노드와 엣지 리스트를 반환합니다.
        """
        if cls.driver is None:
            return {"nodes": [], "edges": []}

        # 관련 기록들에 대한 1-hop 이웃을 간단하게 추출
        query = """
        MATCH (r:Record)
        WHERE r.recordId IN $recordIds AND r.userId = $userId
        
        // 직접 연결된 노드들 (Events, Emotions) 찾기
        OPTIONAL MATCH path = (r)-[*1..2]-(n)
        WHERE NOT n:User // User 노드는 슈퍼노드가 될 수 있으므로 제외
        
        RETURN path
        LIMIT 50
        """

        params = {"userId": user_id, "recordIds": record_ids}

        nodes_map = {}
        edges_list = []

        async with cls.driver.session() as session:
            try:
                result = await session.run(query, params)

                # AsyncResult를 리스트로 변환
                async for record in result:
                    path = record.get("path")
                    if path:
                        for node in path.nodes:
                            # 노드 직렬화
                            n_props = dict(node)
                            n_props["_labels"] = list(node.labels)
                            # 중복 제거를 위해 element_id를 키로 사용
                            nodes_map[node.element_id] = n_props

                        for rel in path.relationships:
                            edges_list.append(
                                {
                                    "source": rel.start_node.element_id,
                                    "target": rel.end_node.element_id,
                                    "type": rel.type,
                                    "properties": dict(rel),
                                }
                            )

                return {"nodes": list(nodes_map.values()), "edges": edges_list}

            except Exception as e:
                print(f"Error fetching subgraph: {e}")
                return {"nodes": [], "edges": []}


neo4j_db = Neo4jDB()
