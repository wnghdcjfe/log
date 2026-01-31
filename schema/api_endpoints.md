# API 엔드포인트 요약 (API Endpoints Summary)

`backend/a.md`를 기반으로 정의된 API 엔드포인트 목록입니다.

## 1. 기록 관리 (Record Management)

### 기록 생성 (Create Record)
*   **엔드포인트**: `POST /records`
*   **설명**: 새로운 기록(일기)을 생성하고 저장합니다. 서버는 `createdAt`이 제공되지 않으면 자동으로 할당합니다.
*   **입력 (Input)**:
    *   `title` (string, 필수): 기록 제목.
    *   `content` (string, 필수): 기록의 본문 내용.
    *   `feel` (array[string], 필수): 사용자가 입력한 기분/감정 리스트.
    *   `date` (date, 필수): 기록 날짜.
    *   `userId` (string, 필수): 사용자 ID.
*   **출력 (Output)**:
    *   `recordId` (string): 생성된 기록의 고유 ID.

## 2. 타임라인 및 시각화 (Timeline & Visualization)

### 기록 타임라인 조회 (Get Record Timeline)
*   **엔드포인트**: `GET /records/timeline`
*   **설명**: 특정 날짜 범위 내의 기록을 시간 순으로 조회합니다.
*   **입력 (Query Params)**:
    *   `from` (date): 시작 날짜.
    *   `to` (date): 종료 날짜.
*   **출력 (Output)**:
    *   시간 순으로 정렬된 기록 목록.

## 3. 추론 및 QA (Reasoning & QA)

### 질문하기 (Ask Question)
*   **엔드포인트**: `POST /question`
*   **설명**: 사용자의 기록을 바탕으로 질문합니다. 추론 엔진(Reason Engine)을 사용하여 답변과 함께 추론 경로(reasoning path)를 제공합니다.
*   **입력 (Input)**:
    *   `userId` (string, 필수).
    *   `text` (string, 필수): 질문 내용.
*   **출력 (Output)**:
    *   `answer` (string): 자연어 답변.
    *   `reasoningPath` (object): 답변에 도달하기 위한 경로 (`nodes`, `edges`, `records`).
    *   `confidence` (float): 신뢰도 점수.
