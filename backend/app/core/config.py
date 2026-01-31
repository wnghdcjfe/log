from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "Personal Memory System"
    API_V1_STR: str = "/api/v1"

    # MongoDB (Atlas)
    # Example: mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/?retryWrites=true&w=majority
    MONGODB_URI: str
    DATABASE_NAME: str = "outbrain"
    COLLECTION_NAME: str = "diaries"

    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    # NVIDIA NeMo (LLM)
    NVIDIA_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings():
    return Settings()
