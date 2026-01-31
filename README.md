갑자기 여자친구가 기분이 나쁘다고 했다.... 어떻게 해야할까? 
# OUTBRAIN
OUTBRAIN은 일기를 단순히 저장하지 않고, 기록을 벡터와 그래프로 구조화하여 개인의 기억과 경험을 분석하는 인사이트 다이어리입니다. 

사용자는 일기를 쓰는 것만으로 과거의 감정, 사람, 사건이 어떻게 반복·연결되는지를 그래프 기반 인사이트로 확인할 수 있습니다. 

### 핵심 가치

- **의미 검색 (Vector Memory)**: 비슷한 감정, 경험을 의미적으로 연결
- **관계 메모리 (Graph Memory)**: 사람, 사건, 감정의 인과관계를 구조화
- **AI 추론 엔진**: 과거 패턴을 기반으로 통찰력 있는 답변 제공
- **시각화**: 기억을 그래프로 시각화하여 직관적 이해

---

## 🏗 시스템 아키텍처

### 전체 시스템 구조

```
┌─────────────────────────────────────────────────┐
│           Frontend (React + Vite)               │
│  ┌──────────────────────────────────────────┐   │
│  │ Pages: Search, Write, Read, Insight      │   │
│  │ Context: DiariesContext (Global State)   │   │
│  │ API Client: diaries.ts, question.ts      │   │
│  └──────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────┘
                   │ HTTP REST API
┌──────────────────┴──────────────────────────────┐
│           Backend (FastAPI)                     │
│  ┌──────────────────────────────────────────┐   │
│  │ API Layer:                               │   │
│  │  - /api/v1/records (CRUD)                │   │
│  │  - /api/v1/question (RAG)                │   │
│  ├──────────────────────────────────────────┤   │
│  │ Service Layer:                           │   │
│  │  - IngestionService (데이터 파이프라인)  │   │
│  │  - ReasoningService (RAG 오케스트레이션) │   │
│  │  - RecordService (CRUD)                  │   │
│  │  - LLMService (OpenAI/NVIDIA 통합)       │   │
│  └──────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────┘
                   │
       ┌───────────┴───────────┬──────────────┐
       │                       │              │
┌──────▼──────┐   ┌───────────▼────┐   ┌────▼─────┐
│  MongoDB    │   │  Neo4j Graph   │   │ OpenAI   │
│  (Atlas)    │   │                │   │          │
│             │   │                │   │          │
│ - Records   │   │ - Knowledge    │   │ - LLM    │
│ - Vector    │   │   Graph        │   │ - Embed  │
│   Search    │   │ - Subgraph     │   │ - Rerank │
└─────────────┘   └────────────────┘   └──────────┘
```

### 데이터 레이어 아키텍처

```
[일기 작성]
  ↓
[Ingestion Service]
  ├─ 1. 텍스트 임베딩 (OpenAI)
  ├─ 2. MongoDB 저장 (embedding 포함)
  └─ 3. Neo4j 그래프 생성 (Entity Extraction)

[질문 처리 - RAG Pipeline]
  ↓
[Reasoning Service]
  ├─ 1. 질문 임베딩
  ├─ 2. Hybrid Search (Vector + Text + Time Decay)
  ├─ 3. LLM Reranking (관련성 재평가)
  ├─ 4. Graph Retrieval (컨텍스트 서브그래프)
  └─ 5. Answer Generation (LLM 추론)
```

---

## 🛠 기술 스택

### Backend
| 카테고리 | 기술 | 용도 |
|---------|------|------|
| Framework | FastAPI | 비동기 REST API |
| Document DB | MongoDB Atlas | 일기 저장 + Vector Search |
| Graph DB | Neo4j | 관계 메모리, 엔티티 그래프 |
| LLM Provider | OpenAI   | 임베딩, 답변 생성, Reranking |
| Async DB Driver | Motor (MongoDB), AsyncGraphDatabase (Neo4j) | 비동기 데이터베이스 연결 |
| Validation | Pydantic | 데이터 검증 및 설정 관리 |

### Frontend
| 카테고리 | 기술 | 용도 |
|---------|------|------|
| Framework | React 18.2 + TypeScript | UI 구축 |
| Build Tool | Vite 5.0 | 개발 환경 |
| Routing | React Router 6.21 | SPA 라우팅 |
| Styling | TailwindCSS 3.3 | 유틸리티 기반 스타일링 |
| Rich Editor | Lexical 0.39 | 일기 작성 에디터 |
| Graph Viz | ReactFlow 11.10, D3.js 7.8 | 그래프 시각화 |
| State | Context API | 전역 상태 관리 |

### AI/ML
- **Embedding Model**: OpenAI `text-embedding-3-small` (1536차원)
- **Chat Model**: OpenAI `gpt-4o` 
- **Reranking**: LLM 기반 관련성 점수 계산 (0.0~1.0)

---

## 🚀 핵심 기능

### 1. 개인 기록 입력/생성 파이프라인

**자유 텍스트 → 구조화된 메모리**

- 자유 텍스트 일기를 표준 Record로 저장
- UUID 기반 `recordId`로 MongoDB와 Neo4j 연결
- 수정/삭제(soft delete) 라이프사이클 지원
- 자동 임베딩 생성 (1536차원 벡터)
- LLM 기반 엔티티 자동 추출 (Event, Person, Emotion, Action, Outcome)

**Record 스키마**
```json
{
  "recordId": "UUID",
  "userId": "string",
  "title": "string",
  "content": "string",
  "feel": ["기쁨", "슬픔"],
  "date": "YYYY-MM-DD",
  "createdAt": "datetime",
  "updatedAt": "datetime?",
  "deletedAt": "datetime?",
  "embedding": [1536차원 float 배열]
}
```

---

### 2. 의미 메모리 (Vector Memory)

**MongoDB Atlas Vector Search 기반**

- **목적**: "비슷한 기록"을 의미적으로 빠르게 검색
- **구성**:
  - 텍스트(title + content) → OpenAI Embedding → VectorDB 저장
  - Vector Index + Text Index (BM25-like)
- **검색 알고리즘**:
  - **Hybrid Search**: Vector Search + Text Search
  - **RRF Fusion**: Reciprocal Rank Fusion (k=60)
  - **Time Decay**: 최신 기록 우선 (30일 반감기, weight=0.3)
  - **결과**: 의미 유사도 + 시간 가중치를 결합한 최종 점수

**검색 공식**
```python
RRF Score = weight * (1 / (k + rank))
Time Decay = 2^(-days_ago / 30)
Final Score = (1 - 0.3) * RRF + 0.3 * Time_Decay
```

---

### 3. 관계 메모리 (Graph Memory)

**Neo4j 기반 Knowledge Graph**

- **목적**: 기록을 구조화하여 패턴·관계·인과를 누적
- **노드 타입**: User, Record, Event, Person, Emotion, Action, Outcome
- **관계 타입**: OWNS, HAS_EVENT, HAS_EMOTION, INVOLVES, HAS_ACTION, LEADS_TO
- **설명가능성**: 모든 관계는 `evidenceRecordId`(UUID) 보유
- **인덱스**: userId + recordId 복합 인덱스로 빠른 조회

**그래프 스키마 예시**
```cypher
(:User {userId})
  -[:OWNS]->
(:Record {recordId, date, userId})
  -[:HAS_EVENT]-> (:Event {summary})
    -[:INVOLVES]-> (:Person {name})
    -[:HAS_ACTION]-> (:Action {description})
      -[:LEADS_TO]-> (:Outcome {description})
  -[:HAS_EMOTION]-> (:Emotion {label})
```

---

### 4. RAG 기반 질문 처리 파이프라인

**6단계 추론 엔진**

1. **질문 임베딩**: 자연어 질문 → 벡터 변환
2. **Hybrid Search**: Vector + Text 검색, Time Decay 적용 (상위 10개)
3. **LLM Reranking**: 관련성 재평가 (0.0~1.0 점수) → 상위 5개 선택
4. **Graph Retrieval**: 선택된 recordId로 Neo4j 서브그래프 조회 (1-hop, 최대 50개 경로)
5. **LLM Reasoning**: 컨텍스트(Vector + Graph) 기반 답변 생성
6. **응답 구성**: answer + confidence + reasoningPath (참조 일기, 그래프 통계)

**예시 질문-답변**
```
Q: "퇴사를 고민한 적은?"
A: "음, 작년 11월에 퇴사를 고민했던 것 같아.
    그때 회사 스트레스가 심했고, 새로운 기회를 찾고 있었어."
Confidence: 0.85
Reasoning: 2024-11-15 일기 참조 (회사 스트레스, 이직 고민 언급)
```

--- 

## 🔄 데이터 플로우

### 일기 작성 플로우

```
[Frontend WritePage]
  ├─ 입력: title, content, feel, date, userId
  └─ POST /api/v1/records
        ↓
[Backend IngestionService]
  ├─ 1. 텍스트 결합 (title + content)
  ├─ 2. LLM.get_embedding() → 1536차원 벡터
  ├─ 3. UUID recordId 생성
  ├─ 4. MongoDB 저장 (embedding 포함)
  ├─ 5. LLM.generate_graph_cypher() → Cypher 쿼리
  └─ 6. Neo4j 저장
        - User 노드 (MERGE)
        - Record 노드 (CREATE)
        - Event/Person/Emotion/Action/Outcome 노드
        - 관계 생성 (모두 evidenceRecordId 포함)
        ↓
[Response]
  └─ { recordId: "UUID" }
```

### 질문 처리 플로우 (RAG)

```
[Frontend SearchPage]
  ├─ 입력: "퇴사를 고민한 적은?"
  └─ POST /api/v1/question
        ↓
[Backend ReasoningService]
  ├─ 1. [Embedding]
  │    LLM.get_embedding(question) → query_vector
  │
  ├─ 2. [Hybrid Search]
  │    VectorDB.search(query_vector, query_text)
  │      ├─ Vector Search (cosine similarity)
  │      ├─ Text Search (BM25-like keyword)
  │      ├─ RRF Fusion (weight=0.5 each)
  │      ├─ Time Decay (weight=0.3, 30-day half-life)
  │      └─ Top 10 candidates
  │
  ├─ 3. [Reranking]
  │    LLM.rerank(query, documents, top_k=5)
  │      └─ 각 문서의 관련성 점수 (0.0~1.0)
  │
  ├─ 4. [Graph Retrieval]
  │    Neo4j.get_context_subgraph(user_id, record_ids, hop=1)
  │      ├─ recordId 기반 조회
  │      ├─ 1-hop 이웃 탐색 (User 제외)
  │      └─ 최대 50개 경로
  │
  ├─ 5. [LLM Reasoning]
  │    LLM.generate_answer_with_reasoning(
  │      question,
  │      context_records,    # Vector 검색 결과
  │      context_graph       # Neo4j 서브그래프
  │    )
  │      ├─ 한국어 반말 톤
  │      ├─ 컨텍스트 기반 추론
  │      └─ confidence 점수 계산
  │
  └─ 6. [Response]
       {
         "answer": "음, 작년 11월에...",
         "confidence": 0.85,
         "reasoningPath": {
           "summary": "2024-11-15 일기 참조...",
           "records": ["mongo_id_1", "mongo_id_2"],
           "graph_snapshot": {
             "node_count": 15,
             "edge_count": 20
           }
         }
       }
```

---

## 💻 설치 및 실행

### 사전 요구사항

- Python 3.10+
- Node.js 18+
- MongoDB Atlas 계정 (Vector Search 지원)
- Neo4j 데이터베이스 (로컬 또는 Aura)
- OpenAI API Key 또는 NVIDIA NeMo API Key

### 환경 변수 설정

`backend/.env` 파일 생성:
```env
# MongoDB (Atlas)
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=outbrain
COLLECTION_NAME=diaries

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# LLM Provider  
LLM_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL_NAME=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# NVIDIA NeMo (선택적)
NVIDIA_API_KEY=nvapi-...
```

### MongoDB Atlas Vector Search 인덱스 생성

MongoDB Atlas Console에서 `diaries` 컬렉션에 인덱스 생성:

**Vector Index (vector_index)**
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

**Text Index (text_index)**
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string" },
      "content": { "type": "string" }
    }
  }
}
```

### Neo4j 인덱스 생성

Neo4j 브라우저 또는 Cypher Shell에서 실행:
```cypher
CREATE INDEX user_record_idx IF NOT EXISTS
FOR (r:Record)
ON (r.userId, r.recordId);

CREATE INDEX user_entity_idx IF NOT EXISTS
FOR (e:Event)
ON (e.userId);

CREATE INDEX user_idx IF NOT EXISTS
FOR (u:User)
ON (u.userId);
```

### 백엔드 실행 (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API 서버: http://localhost:8000
- API 문서 (Swagger): http://localhost:8000/docs
- API 문서 (ReDoc): http://localhost:8000/redoc

---

### 프론트엔드 실행 (Vite)

```bash
cd frontend
npm install
npm run dev
```

- 프론트엔드: http://localhost:5173
- API 요청은 `/api` 경로를 통해 `http://localhost:8000`으로 자동 프록시

---

### 프로덕션 빌드

```bash
# 프론트엔드 빌드
cd frontend
npm run build

# 백엔드가 frontend/dist를 자동으로 서빙
cd ../backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

--- 

### Records API

#### 1. 일기 목록 조회
```http
GET /records
Query Parameters:
  - user_id (optional): 특정 사용자 필터링

Response: 200 OK
[
  {
    "_id": "mongo_object_id",
    "recordId": "uuid",
    "userId": "user123",
    "title": "오늘의 일기",
    "content": "오늘은...",
    "feel": ["기쁨"],
    "date": "2024-11-15",
    "createdAt": "2024-11-15T10:00:00Z",
    "updatedAt": null,
    "deletedAt": null
  }
]
```

#### 2. 일기 상세 조회
```http
GET /records/{record_id}

Response: 200 OK
{
  "_id": "mongo_object_id",
  "recordId": "uuid",
  ...
}

Error: 404 Not Found
{
  "detail": "Record not found"
}
```

#### 3. 일기 생성
```http
POST /records
Content-Type: application/json

Request Body:
{
  "userId": "user123",
  "title": "오늘의 일기",
  "content": "오늘은 정말 좋은 일이 있었다. 친구를 만나서...",
  "feel": ["기쁨", "평온"],
  "date": "2024-11-15"
}

Response: 201 Created
{
  "recordId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Record created successfully"
}
```

#### 4. 일기 수정
```http
PUT /records/{record_id}
Content-Type: application/json

Request Body:
{
  "title": "수정된 제목",
  "content": "수정된 내용",
  "feel": ["평온"],
  "date": "2024-11-15"
}

Response: 200 OK
{
  "_id": "mongo_object_id",
  "recordId": "uuid",
  "updatedAt": "2024-11-15T11:00:00Z",
  ...
}
```

#### 5. 일기 삭제 (Soft Delete)
```http
DELETE /records/{record_id}

Response: 204 No Content
```

---

### Question API (RAG)

#### 질문 처리
```http
POST /question
Content-Type: application/json

Request Body:
{
  "userId": "user123",
  "text": "퇴사를 고민한 적은?",
  "searchSessionId": null  // optional
}

Response: 200 OK
{
  "answer": "음, 작년 11월에 퇴사를 고민했던 것 같아. 그때 회사 스트레스가 심했고...",
  "confidence": 0.85,
  "reasoningPath": {
    "summary": "2024-11-15 일기와 2024-11-20 일기를 참조했어요.",
    "records": [
      "673abc123def456...",
      "673def789ghi012..."
    ],
    "graph_snapshot": {
      "node_count": 15,
      "edge_count": 22
    }
  }
}

Error: 400 Bad Request
{
  "detail": "Question text is required"
}
```

---

## 🗄 데이터베이스 스키마

### MongoDB Document Schema

**컬렉션**: `outbrain.diaries`

```javascript
{
  _id: ObjectId,               // MongoDB 기본 키 (프론트엔드 표시용)
  recordId: String (UUID),     // 애플리케이션 레벨 고유 ID (Neo4j 연결용)
  userId: String,              // 사용자 식별자
  title: String,               // 일기 제목
  content: String,             // 일기 본문
  feel: [String],              // 감정 태그 배열 ["기쁨", "슬픔", ...]
  date: String (YYYY-MM-DD),   // 일기 날짜
  createdAt: ISODate,          // 생성 시각
  updatedAt: ISODate | null,   // 수정 시각
  deletedAt: ISODate | null,   // 삭제 시각 (soft delete)
  embedding: [Number]          // 1536차원 임베딩 벡터
}
```

**인덱스**:
- `vector_index`: embedding 필드 벡터 검색 (cosine similarity)
- `text_index`: title, content 필드 전문 검색 (BM25-like)
- `{ userId: 1, createdAt: -1 }`: 사용자별 최신 일기 조회

---

### Neo4j Graph Schema

**노드 타입**:

```cypher
// 사용자
(:User {
  userId: String,
  createdAt: DateTime
})

// 일기 레코드
(:Record {
  recordId: String (UUID),     // MongoDB recordId와 동일
  userId: String,
  date: String,
  createdAt: DateTime
})

// 이벤트
(:Event {
  id: String,
  summary: String,
  userId: String
})

// 사람
(:Person {
  name: String,
  userId: String
})

// 감정
(:Emotion {
  label: String,               // "기쁨", "슬픔", "분노", ...
  userId: String
})

// 행동
(:Action {
  description: String,
  userId: String
})

// 결과
(:Outcome {
  description: String,
  userId: String
})
```

**관계 타입**:

```cypher
(:User)-[:OWNS]->(:Record)
(:Record)-[:HAS_EVENT]->(:Event)
(:Record)-[:HAS_EMOTION]->(:Emotion)
(:Event)-[:INVOLVES]->(:Person)
(:Event)-[:HAS_ACTION]->(:Action)
(:Action)-[:LEADS_TO]->(:Outcome)
```

**설명가능성 보장**:
- 모든 관계는 `evidenceRecordId` 속성 보유
- 추론 시 근거 추적 가능

**예시 그래프**:
```cypher
(:User {userId: "user123"})
  -[:OWNS]->
(:Record {recordId: "uuid-1", date: "2024-11-15"})
  -[:HAS_EVENT]->
(:Event {summary: "회사 미팅"})
  -[:INVOLVES]->
(:Person {name: "김대리"})

(:Record {recordId: "uuid-1"})
  -[:HAS_EMOTION]->
(:Emotion {label: "스트레스"})
```

---

## 📂 프로젝트 구조

```
log/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── api.py              # API 라우터 통합
│   │   │       └── endpoints/
│   │   │           ├── records.py      # 일기 CRUD API
│   │   │           └── question.py     # 질문 처리 API
│   │   ├── core/
│   │   │   └── config.py               # 환경 설정
│   │   ├── db/
│   │   │   ├── mongo.py                # MongoDB 연결
│   │   │   ├── graph.py                # Neo4j 연결
│   │   │   └── vector.py               # Vector Search 추상화
│   │   ├── models/
│   │   │   ├── domain/
│   │   │   │   ├── record.py           # Record 도메인 모델
│   │   │   │   └── graph.py            # Graph 도메인 모델
│   │   │   └── schemas/
│   │   │       ├── record_req.py       # Record 요청 스키마
│   │   │       └── question_req.py     # Question 요청 스키마
│   │   ├── services/
│   │   │   ├── llm_service.py          # LLM 통합 서비스
│   │   │   ├── ingestion_service.py    # 일기 수집 파이프라인
│   │   │   ├── record_service.py       # Record CRUD
│   │   │   └── reasoning_service.py    # RAG 오케스트레이션
│   │   └── main.py                     # FastAPI 앱 엔트리포인트
│   ├── tests/                          # 테스트 코드
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── diaries.ts              # Diaries API 클라이언트
│   │   │   └── question.ts             # Question API 클라이언트
│   │   ├── components/
│   │   │   ├── DiaryEditor.tsx         # Lexical 에디터
│   │   │   ├── KeywordGraph.tsx        # ReactFlow 그래프
│   │   │   ├── SearchBar.tsx           # 검색 입력
│   │   │   ├── Timeline.tsx            # 타임라인
│   │   │   ├── GraphDetailPanel.tsx    # 그래프 상세 패널
│   │   │   └── NodeDetailPanel.tsx     # 노드 상세 패널
│   │   ├── context/
│   │   │   └── DiariesContext.tsx      # 전역 상태 (Context API)
│   │   ├── hooks/
│   │   │   └── useDiaries.ts           # 커스텀 훅
│   │   ├── pages/
│   │   │   ├── SearchPage.tsx          # 검색/질문 페이지
│   │   │   ├── WritePage.tsx           # 일기 작성 페이지
│   │   │   ├── ReadPage.tsx            # 일기 목록 페이지
│   │   │   └── InsightPage.tsx         # 인사이트 대시보드
│   │   ├── App.tsx                     # 라우팅
│   │   └── main.tsx                    # 엔트리포인트
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── data/                               # 샘플 데이터
├── schema/                             # 스키마 정의
└── README.md
```

---
 

### 성능 (Performance)  
- **인덱스 전략**:
  - `user_record_idx`: (userId, recordId) 복합 인덱스
  - `user_entity_idx`: userId 단일 인덱스
- **Hop 제한**: 1-2 hop으로 서브그래프 크기 제어
- **User 노드 제외**: 슈퍼노드로 인한 성능 저하 방지
- **경로 제한**: 최대 50개 경로 반환 
---

## 🧪 테스트

### 테스트 실행

```bash
cd backend
pytest tests/ -v
```

### 주요 테스트 파일
- `tests/api/test_question.py`: 질문 API 통합 테스트
- `tests/db/test_graph.py`: Neo4j 연결 및 쿼리 테스트
- `tests/db/test_mongo.py`: MongoDB 연결 및 CRUD 테스트
- `tests/services/test_reasoning_service.py`: RAG 파이프라인 테스트
- `tests/services/test_llm_service.py`: LLM 서비스 단위 테스트

### 테스트 커버리지

주요 커버리지 항목:
- Hybrid Search (Vector + Text + RRF + Time Decay)
- LLM Reranking
- Graph Subgraph Retrieval
- RAG 파이프라인 (end-to-end) 
---

## 📄 라이선스

이 프로젝트는 개인 연구 목적으로 제작되었습니다. 
---

## 📧 문의

프로젝트에 대한 질문이나 제안이 있으시면 이슈를 등록해주세요.

---

여자친구가 기분이 나쁠땐? 
아웃브레인~
감사합니다. 
