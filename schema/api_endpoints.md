# API 엔드포인트 요약 (API Endpoints Summary)

`backend/a.md`를 기반으로 정의된 API 엔드포인트 목록입니다.

## 1. 기록 관리 (Record Management)

### 기록 생성 (Create Record)
*   **엔드포인트**: `POST /records`
*   **설명**: 새로운 기록(일기)을 생성하고 저장합니다. 서버는 `createdAt`이 제공되지 않으면 자동으로 할당합니다. 또한 감정 추출 파이프라인을 트리거합니다.
*   **입력 (Input)**:
    *   `content` (string, 필수): 기록의 본문 내용.
    *   `userId` (string, 필수): 사용자 ID.
    *   `people` (array, 선택): 언급된 인물 목록.
    *   `places` (array, 선택): 언급된 장소 목록.
    *   `emotionTags` (array, 선택): 감정 태그 목록.
    *   `source` (string, 선택): 기록의 출처.
*   **출력 (Output)**:
    *   `recordId` (string): 생성된 기록의 고유 ID.

## 2. 검색 및 컨텍스트 (Search & Context)

### 의미 검색 (Semantic Search)
*   **엔드포인트**: `POST /search`
*   **설명**: 기록에 대한 의미 검색(Semantic Search)을 수행하고 결과를 바탕으로 컨텍스트 그래프(서브그래프)를 생성합니다. 이 세션은 후속 질문에 사용될 수 있습니다.
*   **입력 (Input)**:
    *   `text` (string, 필수): 검색 쿼리.
    *   `since` (date, 선택): 시작 날짜 필터.
    *   `until` (date, 선택): 종료 날짜 필터.
    *   `topK` (int, 선택): 반환할 결과 개수.
    *   `timeWeight` (float, 선택): 점수 산정 시 최신성 가중치.
*   **출력 (Output)**:
    *   `searchSessionId` (string): 검색 세션(컨텍스트) ID.
    *   `contextGraph` (object): `directNodes`, `nodes`, `edges`, `sourceRecords`를 포함하는 구성된 서브그래프.
    *   `results` (array): `recordId`, `score`, `snippet` 목록.

## 3. 타임라인 및 시각화 (Timeline & Visualization)

### 기록 타임라인 조회 (Get Record Timeline)
*   **엔드포인트**: `GET /records/timeline`
*   **설명**: 특정 날짜 범위 내의 기록을 시간 순으로 조회합니다.
*   **입력 (Query Params)**:
    *   `from` (date): 시작 날짜.
    *   `to` (date): 종료 날짜.
*   **출력 (Output)**:
    *   시간 순으로 정렬된 기록 목록.

### 그래프 타임라인 조회 (Get Graph Timeline)
*   **엔드포인트**: `GET /graph/timeline`
*   **설명**: 특정 기준 날짜를 중심으로 그래프 데이터(Event/Person 등)의 요약을 조회합니다.
*   **입력 (Query Params)**:
    *   `anchorDate` (date): 기준 날짜.
    *   `window` (string/int): 시간 윈도우 크기.
*   **출력 (Output)**:
    *   지정된 기간의 그래프 요약 데이터.

## 4. 추론 및 QA (Reasoning & QA)

### 질문하기 (Ask Question)
*   **엔드포인트**: `POST /question`
*   **설명**: 사용자의 기록을 바탕으로 질문합니다. 추론 엔진(Reason Engine)을 사용하여 답변과 함께 추론 경로(reasoning path)를 제공합니다.
*   **입력 (Input)**:
    *   `userId` (string, 필수).
    *   `text` (string, 필수): 질문 내용.
    *   `searchSessionId` (string, 선택): 이전 `/search` 호출에서 받은 컨텍스트 ID.
*   **출력 (Output)**:
    *   `answer` (string): 자연어 답변.
    *   `reasoningPath` (object): 답변에 도달하기 위한 경로 (`nodes`, `edges`, `records`).
    *   `confidence` (float): 신뢰도 점수.
    *   `caveat` (string, 선택): 답변에 대한 주의사항 또는 한계점.
