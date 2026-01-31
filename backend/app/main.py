from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings

settings = get_settings()

from contextlib import asynccontextmanager
from app.db.mongo import mongo_db
from app.db.graph import neo4j_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await mongo_db.connect()
    await neo4j_db.connect()
    yield
    # Shutdown
    await mongo_db.close()
    await neo4j_db.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from app.api.v1.api import api_router

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {"message": "Personal Memory System Backend is running"}


# TODO: Add Events (Startup/Shutdown) for DB connections
# TODO: Add Routers
