# OUTBRAIN

## 설정

1. `.env` 파일 확인 (프로젝트 루트)
```
MONGODB_URI=mongodb+srv://...
MONGODB_DATABASE=memory_db
```

2. 백엔드 실행 (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# http://localhost:8000
```

3. 프론트엔드 실행
```bash
cd frontend && npm run dev
# http://localhost:5173
```

프론트는 `/api` 요청을 `http://localhost:8000`으로 프록시합니다.

## API (백엔드)

- `GET /api/v1/records` - 전체 일기 목록
- `GET /api/v1/records/{id}` - 일기 상세
- `POST /api/v1/records` - 일기 생성 (title, content, feel, date, userId)
- `PUT /api/v1/records/{id}` - 일기 수정
- `DELETE /api/v1/records/{id}` - 일기 삭제 (soft delete)
