# OUTBRAIN

**기억을 그래프로 확장하는 개인 인사이트 다이어리**

OUTBRAIN은 사용자의 일기를 단순 저장하는 앱이 아니라,
기록을 의미(Vector)와 관계(Graph)로 구조화하여 패턴·관계·인과를 되돌려주는 개인 사고 확장 시스템입니다.

사용자는 일기를 쓰는 것만으로 과거의 감정, 사람, 사건이 어떻게 반복·연결되는지를 그래프 기반 인사이트로 확인할 수 있습니다.

---

## 1. 제품 한 줄 요약

OUTBRAIN은 **일기를 쓰면 그 기록을 그래프 메모리로 변환해 “인사이트화된 일기”를 만들어주는 앱**입니다.

---

## 2. 아키텍처

```
[Input]
  ↓
[Vector Memory] ── 의미 기반 검색
  ↓
[Graph Memory] ── 관계 · 시간 · 인과 누적
  ↓
[Reasoning Engine] ── 추론 경로 + 인사이트 생성
```

---

## 3. 핵심 기능

### A. 개인 기록 입력/생성 파이프라인

* 자유 텍스트 일기를 표준 Record로 저장
* 이후 저장/검색/추론의 기준 키는 `recordId`
* 수정/삭제(soft delete) 라이프사이클 지원

**Record 스키마**

* 필수: `recordId, userId, title, date, content, feel[], createdAt`
* 추가: `updatedAt, deletedAt`

---

### B. 의미 메모리(Vector Memory)

* 목적: “비슷한 기록”을 빠르게 찾는 의미 검색 기반 제공
* 구성: record content → embedding → VectorDB 저장
* 검색: cosineSim + 시간 가중치(timeDecay)

---

### C. 관계 메모리(Graph Memory)

* 목적: 기록을 구조화(Event/Person/Emotion/Action/Outcome)하여 반복·관계를 누적
* 모든 관계는 evidence(recordId)를 반드시 보유하여 설명가능성 확보

---

### D. 검색 오케스트레이션 → 컨텍스트 그래프 생성

* Vector 검색 결과(record 집합)를 “서브그래프 컨텍스트”로 변환
* 재사용 가능한 SearchSession으로 저장 가능

---

### E. 질문 처리 + 추론 경로(reasoningPath) 생성

* 질문에 대해 답만 주지 않고
* “내 기록 기반으로 어떤 경로로 결론이 나왔는지”를 구조화해 제공

--- 

### 4.1 백엔드 실행 (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# http://localhost:8000
```

---

### 4.2 프론트엔드 실행

```bash
cd frontend && npm run dev
# http://localhost:5173
```

프론트는 `/api` 요청을 `http://localhost:8000`으로 프록시합니다.

---

## 5. API (백엔드)

### Records

* `GET /api/v1/records`

  * 전체 일기 목록

* `GET /api/v1/records/{id}`

  * 일기 상세 조회

* `POST /api/v1/records`

  * 일기 생성
  * Body: `title, content, feel, date, userId`

* `PUT /api/v1/records/{id}`

  * 일기 수정

* `DELETE /api/v1/records/{id}`

  * 일기 삭제 (soft delete)

---

## 6. 보안/정합성/성능 원칙(NFR)

* userId 스코프 강제

  * VectorDB: metadata filter 필수
  * GraphDB: MATCH 템플릿에 userId 조건 포함
* 삭제 정합성

  * record 삭제 시 Vector/Graph 동시 처리
  * 실패 시 재시도/보상 트랜잭션 정책
* 성능 제한

  * Vector topK 제한(예: 20~50)
  * Graph hop 제한(예: 2~3)
* 설명가능성 강제

  * evidenceRecordId 없는 관계는 저장 금지
  * reasoningPath는 evidence 없는 edge 제외 