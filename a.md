아래는 PRD A의 요구사항을 **“핵심 기능(큰 덩어리) → 그걸 만들기 위해 필요한 상세 개발 요구사항(구현 항목)”** 형태로 다시 풀어쓴 것입니다.
즉, FR 문장을 그대로 반복하지 않고, **개발해야 할 실제 기능/모듈/데이터/검증 포인트**로 전개합니다.

---

# PRD A 요구사항 처리안 

## 아키텍처
```
[Input]
  ↓
[Vector Memory] ── 의미 검색
  ↓
[Graph Memory] ── 관계·시간·인과
  ↓
[Reasoning Engine] ── 추론 경로 생성
```


## 핵심 기능 1) 개인 기록 입력/생성 파이프라인

### 목표

사용자 일기(자유 텍스트)를 표준 Record로 만들고, 이후 모든 저장/검색/추론의 기준 키(recordId)를 보장합니다.

### 상세 개발 요구사항

1. **Record 스키마 정의**

   * 필수: `recordId, userId, content, createdAt`
   * 선택: `people[], places[], emotionTags[], source`
   * 수정/삭제를 고려해 `updatedAt, deletedAt` 포함

2. **입력 API**

   * `POST /records` : content + optional metadata 입력
   * 서버에서 `createdAt` 자동 부여
   * 응답: `recordId`

3. **감정 자동 추출 모듈**

   * 입력 content → 감정 라벨/점수 산출
   * 추출 결과는 record metadata로 저장
   * 실패 시 graceful fallback(unknown)

4. **FR-A0 mock 데이터 삽입 스크립트**

   * 사용자 1명 기준 일기 100개 생성
   * 날짜 분산(최근 3개월 등)
   * 감정/인물/사건이 반복되도록 패턴 포함(추론 데모용)

5. **데이터 수명주기 지원**

   * 기록 삭제 시 Vector/Graph 동시 삭제를 위한 “삭제 이벤트” 발행 또는 트랜잭션 처리 기준 확정

---

## 핵심 기능 2) 의미 메모리(Vector Memory) 저장/검색

### 목표

“비슷한 기록”을 빠르게 찾는 검색 기반을 제공합니다(질문/검색의 1차 후보 생성).

### 상세 개발 요구사항

1. **임베딩 생성 파이프라인**

   * record content → embedding 벡터 생성
   * 배치/실시간 선택 가능(초기엔 실시간 권장)
   * embedding 모델 버전 필드 저장(`embedModelVersion`)

2. **VectorDB 저장 구조**

   * key: `recordId`
   * payload: `userId, createdAt, emotion, people, places`
   * 검색에서 userId 필터링(개인 분리 강제)

3. **의미 검색 API**

   * `POST /search` 또는 `POST /query`
   * 입력: `text`, 옵션: `since/until`, `topK`, `timeWeight`
   * 출력: `recordId[] + score + snippet`

4. **시간 가중치 스코어링**

   * 최종 점수 예시:
     `finalScore = α * cosineSim + (1-α) * timeDecay(createdAt)`
   * timeDecay는 최근 기록에 가산점 또는 오래된 기록 패널티

5. **인덱싱/재처리 전략**

   * 기록 수정 시 재임베딩 정책
   * 삭제 시 vector remove 보장

---

## 핵심 기능 3) 관계 메모리(Graph Memory) 구축/누적

### 목표

기록을 Event/Person/Emotion/Action/Outcome로 구조화하고, 반복/관계를 누적해 “관계 기반 탐색/추론”이 가능하게 합니다.

### 상세 개발 요구사항

1. **그래프 스키마/타입 확정**

   * 노드 타입: `Record, Event, Person, Emotion, Action, Outcome`
   * 관계 타입 최소 세트 정의:

     * `(:Record)-[:HAS_EVENT]->(:Event)`
     * `(:Record)-[:HAS_EMOTION]->(:Emotion)`
     * `(:Event)-[:INVOLVES]->(:Person)`
     * `(:Event)-[:HAS_ACTION]->(:Action)`
     * `(:Event)-[:LEADS_TO]->(:Outcome)`
   * 모든 노드/관계에 `userId` 속성 또는 `(:User)` 소유관계로 스코프 강제

2. **엔티티/관계 추출(IE) 모듈**

   * record content → event/person/action/outcome/emotion 추출
   * 중복 통합(같은 인물 이름, 같은 감정 라벨 등) 규칙 필요:

     * canonical name/alias 관리
     * 동일성 키(예: `userId + normalizedName + type`)

3. **그래프 업서트(upsert)**

   * Record 노드 생성 후, 추출된 엔티티 노드 MERGE
   * 관계는 증거를 반드시 보유:

     * 관계에 `recordId` 또는 `evidenceRecordId` 저장
   * “반복은 누적” 구현:

     * 관계에 `count`, `lastSeenAt` 업데이트

4. **시간축 조회 지원**

   * `GET /records/timeline?from&to`
   * `GET /graph/timeline?anchorDate&window`
   * 기록 순서 + 해당 기간의 그래프 요약 데이터 제공

5. **삭제 정합성**

   * record 삭제 시:

     * Record 노드 삭제
     * 관계의 evidence가 사라지는 경우 관계/카운트 재조정
     * 고아 노드(연결 0) 정리 정책

---

## 핵심 기능 4) 검색 오케스트레이션 + 컨텍스트 그래프 생성(FR-A6)

### 목표

검색 결과(record 집합)를 “그래프 컨텍스트(서브그래프)”로 변환하고, 이를 재사용 가능하게 저장합니다.

### 상세 개발 요구사항

1. **검색 결과 → Seed 노드 식별**

   * VectorDB topK recordIds 획득
   * GraphDB에서 해당 recordIds가 언급하는 엔티티를 모아 후보 생성
   * “직접 연관 노드” 선정 규칙:

     * 언급 빈도, 감정 강도, 최신성, query 키워드 매칭 등 점수화
     * 상위 N개를 directNodes로 확정

2. **서브그래프 확장 규칙**

   * directNodes 기준 1~2 hop 확장
   * 관계 weight/빈도 임계값 적용
   * evidence(recordId)가 있는 관계만 포함(설명가능성)

3. **컨텍스트 그래프 포맷 정의**

   * 반환용 JSON 스펙 확정:

     * `directNodes, nodes, edges, sourceRecords`
   * 노드/엣지에는 최소한:

     * id, type, label
     * edge에는 type, weight, evidenceRecordId

4. **컨텍스트 그래프 저장**

   * GraphDB: `(:SearchSession {id, userId, query, ts})` 노드 생성

     * `(:SearchSession)-[:HAS_NODE]->(:Entity)`
     * `(:SearchSession)-[:HAS_EDGE]->(:RelationRef)` 같은 방식 또는
     * “세션 태그” 속성으로 서브그래프를 재현 가능하게 저장
   * VectorDB: context 그래프 자체를 요약 텍스트로 만들어 embedding 저장(질문 연계용)

     * key: `searchSessionId`
     * payload: directNodes, ts, userId

5. **API**

   * `POST /search` → `searchSessionId + contextGraph`

---

## 핵심 기능 5) 질문 처리 + 추론 경로 생성(FR-A7, FR-A8)

### 목표

질문에 대해 답만 주지 않고, “내 기록 기반으로 어떤 경로를 따라 결론이 나왔는지”를 구조화해 제공합니다.

### 상세 개발 요구사항

1. **질문 입력 API (curl 테스트)**

   * `POST /question`
   * 입력: `userId, text, optional: searchSessionId`
   * 출력: `answer + reasoningPath`

2. **질문 관련 근거 기록 검색(Vector)**

   * VectorDB에서 question embedding으로 topK recordIds 확보
   * (선택) 직전 searchSessionId가 있으면 해당 컨텍스트를 prior로 가산점

3. **경로 후보 조회(Graph, Cypher)**

   * 후보 recordIds에서 언급된 엔티티를 seed로 선정
   * seed 기준 1~3 hop 경로 탐색
   * 경로에 포함된 모든 관계는 evidenceRecordId가 topK recordIds 안에 있어야 함
   * 여러 경로 후보를 점수화해 topN 선정

4. **추론 경로 JSON 생성**

   * `nodes[] / edges[] / records[]`
   * records는 근거 텍스트 snippet 포함
   * 각 edge는 evidenceRecordId로 trace 가능해야 함

5. **최종 답변 생성(Reasoning Engine)**

   * 입력: 질문 + reasoningPath JSON
   * 출력: answer(자연어) + confidence + caveat(필요 시)
   * 중요한 제약: “개인 기록 기반”을 문장에도 반영(단정 금지)

6. **질문 결과 누적(FR-A9)**

   * `(:QuestionSession {id,...})` 저장
   * `(:QuestionSession)-[:USES_SEARCH]->(:SearchSession)` 연결
   * 질문에서 새로 발견된 관계가 있으면 그래프에 누적 업서트

---

## 핵심 기능 6) 정합성/보안/성능(NFR)

### 목표

개인 데이터 분리, 검색 성능, 설명가능성, 삭제 정합성을 “시스템적으로 강제”합니다.

### 상세 개발 요구사항

1. **userId 스코프 강제**

   * VectorDB: metadata filter 필수
   * GraphDB: 모든 MATCH에 userId 조건 강제(쿼리 템플릿화)

2. **삭제 트랜잭션**

   * record 삭제 시:

     * Vector delete
     * Graph detach delete 및 관계 재정리
   * 실패 시 재시도/보상 트랜잭션 정책

3. **성능 최적화 규칙**

   * Vector topK 제한(예: 20~50)
   * Graph hop 제한(예: 2~3)
   * 응답 시간 SLA를 위한 early cutoff

4. **설명가능성 강제**

   * edge 생성 시 evidenceRecordId 없으면 저장 금지
   * reasoningPath는 evidence 없는 엣지 제외
 