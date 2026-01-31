# OUTBRAIN

## 설정

1. `.env` 파일 확인 (프로젝트 루트)
```
MONGODB_URI=mongodb+srv://...
MONGODB_DATABASE=outbrain
```

2. MongoDB 시드 (data1.json → MongoDB, date는 Date 타입으로 변환)
```bash
cd backend && npm run seed
```

3. 백엔드 실행 (단일 파일 `index.js`)
```bash
cd backend && npm start
# http://localhost:3001
```

4. 프론트엔드 실행
```bash
cd frontend && npm run dev
# http://localhost:5173
```

## API

- `GET /api/diaries` - 전체 일기 목록 (date는 ISO 문자열로 반환)
