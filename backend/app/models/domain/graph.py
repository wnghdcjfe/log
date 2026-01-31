from typing import List, Optional
from pydantic import BaseModel, Field


class Node(BaseModel):
    id: str  # 식별자 (normalize된 이름 등)
    label: str  # 표시 이름
    type: str  # Event, Person, Emotion, Action, Outcome


class Edge(BaseModel):
    source: str
    target: str
    type: str
    kwargs: dict = Field(default_factory=dict)  # 추가 속성 (count, etc)


class GraphExtractionResult(BaseModel):
    """LLM 추출 결과"""

    events: List[str] = Field(description="List of main events identified")
    people: List[str] = Field(description="ListOf people involved")
    emotions: List[str] = Field(description="List of emotions felt")
    actions: List[str] = Field(description="List of actions taken")
    outcomes: List[str] = Field(description="List of outcomes/results")

    # 관계는 LLM이 명시적으로 주지 않아도, 추출된 리스트를 기반으로 코드로 연결할 수도 있고
    # 또는 LLM에게 (Event, Relationship, Target) Triple을 달라고 할 수도 있음.
    # a.md의 스키마대로라면:
    # Record -> Event
    # Record -> Emotion
    # Event -> Person
    # Event -> Action
    # Event -> Outcome
    # 구조가 비교적 정형화되어 있으므로, 엔티티 리스트만 잘 뽑아도 연결 가능.
    # 하지만 Event가 여러 개일 경우 매핑이 모호해지므로, 구조화된 Event 객체를 뽑는 게 나음.


class GraphEvent(BaseModel):
    summary: str = Field(..., description="Brief summary of the event")
    people: List[str] = Field(
        default_factory=list, description="People involved in this specific event"
    )
    actions: List[str] = Field(
        default_factory=list, description="Actions taken in this event"
    )
    outcomes: List[str] = Field(
        default_factory=list, description="Outcomes of this event"
    )


class GraphData(BaseModel):
    """최종 그래프 구축을 위한 데이터 구조"""

    events: List[GraphEvent]
    emotions: List[str] = Field(..., description="Overall emotions in the record")
