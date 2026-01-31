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
            print("Connected to Neo4j")

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


neo4j_db = Neo4jDB()
