from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
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


# API router inclusion
from app.api.v1.api import api_router

app.include_router(api_router, prefix=settings.API_V1_STR)

# Frontend Static Files Serving
STATIC_DIR = Path(__file__).parent.parent.parent / "frontend" / "dist"


@app.get("/")
async def serve_index():
    index_html = STATIC_DIR / "index.html"
    if index_html.exists():
        return FileResponse(str(index_html))
    return {
        "message": "Frontend build not found. Please run 'npm run build' in the frontend directory."
    }


if STATIC_DIR.exists():
    # Mount assets directory
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # API 및 문서 경로는 무시
        if (
            full_path.startswith(settings.API_V1_STR.strip("/"))
            or full_path.startswith("docs")
            or full_path.startswith("redoc")
            or full_path.startswith("openapi.json")
        ):
            raise HTTPException(status_code=404)

        # 실제 파일이 존재하는지 확인 (favicon.ico 등)
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))

        # 그 외 모든 요청은 index.html (SPA)
        index_html = STATIC_DIR / "index.html"
        if index_html.exists():
            return FileResponse(str(index_html))

        raise HTTPException(status_code=404)


# TODO: Add Events (Startup/Shutdown) for DB connections
# TODO: Add Routers
