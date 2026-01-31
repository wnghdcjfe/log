import httpx
from typing import List, Optional
import json
from app.models.domain.graph import GraphData, GraphEvent
from app.core.config import get_settings

settings = get_settings()


class LLMService:
    """
    NVIDIA NeMo / NVIDIA NIM API와 상호작용하는 서비스입니다.
    현재 임베딩 생성 및 채팅(LLM) 기능을 제공합니다.
    """

    # NVIDIA Embeddings 엔드포인트 예시 (실제 엔드포인트로 교체 필요)
    # NVIDIA NIM 공통 플레이스홀더 엔드포인트 사용
    EMBEDDING_URL = "https://integrate.api.nvidia.com/v1/embeddings"
    CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

    @staticmethod
    async def get_embedding(text: str) -> List[float]:
        """
        NVIDIA NeMo를 사용하여 주어진 텍스트에 대한 임베딩을 생성합니다.
        """
        if not settings.NVIDIA_API_KEY:
            # Fallback or Mock for local dev if key is missing
            print("WARNING: NVIDIA_API_KEY not set. Returning mock embedding.")
            return [0.0] * 1024  # Mock 1024-dim vector

        headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        payload = {
            "input": text,
            "model": "nvidia/nv-embed-v1",  # Example model name, verify actual model
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    LLMService.EMBEDDING_URL,
                    json=payload,
                    headers=headers,
                    timeout=10.0,
                )
                response.raise_for_status()
                data = response.json()
                # OpenAI compatible response format
                return data["data"][0]["embedding"]
            except Exception as e:
                print(f"Error calling NVIDIA API: {e}")
                # API 실패 시 개발 중 안정성을 위한 모의 폴백
                return [0.0] * 1024

    @staticmethod
    async def generate_graph_cypher(
        text: str, user_id: str, record_id: str, date: str
    ) -> str:
        """
        일기 내용을 바탕으로 그래프 노드/관계를 삽입하는 Cypher 쿼리를 생성합니다.
        """
        if not settings.NVIDIA_API_KEY:
            print("WARNING: NVIDIA_API_KEY not set. Returning dummy query.")
            return ""

        headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # 스키마 정의 프롬프트 (영어 유지)
        schema_desc = """
        Graph Schema:
        - Nodes:
          - (:Record {recordId, date, createdAt, userId})
          - (:Event {id, summary, userId})
          - (:Person {name, userId})
          - (:Emotion {label, userId})
          - (:Action {description, userId})
          - (:Outcome {description, userId})
          - (:User {userId})
        
        - Relationships:
          - (:User)-[:OWNS]->(:Record)
          - (:Record)-[:HAS_EVENT]->(:Event)
          - (:Record)-[:HAS_EMOTION]->(:Emotion)
          - (:Event)-[:INVOLVES]->(:Person)
          - (:Event)-[:HAS_ACTION]->(:Action)
          - (:Event)-[:LEADS_TO]->(:Outcome)
        """

        prompt = f"""
        You are a Neo4j Cypher export.
        {schema_desc}

        Task:
        Analyze the following diary entry and generate a SINGLE Cypher query string to insert the data.
        
        Constraints:
        1. Use MERGE for nodes to prevent duplicates.
        2. BIND the provided metadata: userId='{user_id}', recordId='{record_id}', date='{date}'.
        3. The User and Record nodes MUST be created linked via [:OWNS].
        4. Extract Events, People, Emotions, Actions, and Outcomes from the text and link them to the Record/Event.
        5. Return ONLY the raw Cypher query string. No markdown, no explanations, no ```cypher blocks.
        6. Do NOT use any APOC procedures. Use pure Cypher.
        7. Ensure all node properties (strings) are properly escaped.

        Diary Entry:
        "{text}"
        """

        payload = {
            "model": "meta/llama-3.1-70b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,  # Low temperature for code generation stability
            "max_tokens": 2048,
            "stream": False,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    LLMService.CHAT_URL,
                    json=payload,
                    headers=headers,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]

                # Cleanup markdown formatting if present
                clean_query = (
                    content.replace("```cypher", "").replace("```", "").strip()
                )
                return clean_query

            except Exception as e:
                print(f"Error generating Cypher: {e}")
                return ""

    @staticmethod
    async def generate_answer_with_reasoning(
        question: str, context_records: List[dict], context_graph: dict
    ) -> dict:
        """
        다음을 기반으로 답변을 종합합니다:
        - 유사한 기록 (의미 메모리 - Vector Memory)
        - 연결된 그래프 노드 (관계 메모리 - Relationship Memory)

        반환값: { "answer": str, "confidence": float, "reasoning_path": dict }
        """
        # 1. 컨텍스트 포맷팅
        records_text = "\n".join(
            [f"- [{r.get('recordId')}] {r.get('content')}" for r in context_records]
        )

        # 그래프 단순화 하여 프롬프트에 주입
        # (프로토타입용 단순 문자열 변환)
        graph_text = str(context_graph)

        prompt = f"""
        You are an AI assistant helping a user recall their personal memories.
        
        Question: "{question}"
        
        Here are some relevant diary records (Vector Memory):
        {records_text}
        
        Here is the knowledge graph context around those records (Graph Memory):
        {graph_text}

        Task:
        1. Answer the user's question naturally, based ONLY on the provided context.
        2. If the answer is not in the context, say so.
        3. Provide a reasoning path explaining how you connected the dots.

        Output Format (JSON):
        {{
            "answer": "Your natural language response...",
            "confidence": 0.9,
            "reasoning_summary": "I found record X which mentions Y, and the graph shows Y is connected to Z..."
        }}
        """

        if not settings.NVIDIA_API_KEY:
            return {
                "answer": "This is a mock answer because NVIDIA_API_KEY is missing.",
                "confidence": 0.0,
                "reasoning_summary": "Mock reasoning.",
            }

        headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        payload = {
            "model": "meta/llama-3.1-70b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 1024,
            "stream": False,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    LLMService.CHAT_URL, json=payload, headers=headers, timeout=30.0
                )
                data = response.json()
                content = data["choices"][0]["message"]["content"]

                # Cleanup potential markdown ticks
                clean_content = (
                    content.replace("```json", "").replace("```", "").strip()
                )
                return json.loads(clean_content)
            except Exception as e:
                print(f"Error generating answer: {e}")
                return {
                    "answer": "Error generating answer",
                    "confidence": 0.0,
                    "reasoning_summary": str(e),
                }

    @staticmethod
    async def extract_entities(text: str) -> GraphData:
        """
        Extract entities (Events, Person, Action, Outcome, Emotion) from text using LLM.
        Returns a GraphData object.
        """
        if not settings.NVIDIA_API_KEY:
            # Mock data for local testing
            print("WARNING: NVIDIA_API_KEY not set. Returning mock graph data.")
            return GraphData(
                events=[
                    GraphEvent(
                        summary="Mock Event",
                        people=["Mock Person"],
                        actions=["Mock Action"],
                        outcomes=["Mock Outcome"],
                    )
                ],
                emotions=["Neutral"],
            )

        headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # Prompt engineering for JSON extraction
        prompt = f"""
        Analyze the following diary entry and extract structured graph data.
        
        Return ONLY a raw JSON object (no markdown formatting) with the following structure:
        {{
            "events": [
                {{
                    "summary": "Brief summary of the sub-event",
                    "people": ["Name1", "Name2"],
                    "actions": ["Action1", "Action2"],
                    "outcomes": ["Outcome1", "Outcome2"]
                }}
            ],
            "emotions": ["Emotion1", "Emotion2"]
        }}

        Diary Entry:
        "{text}"
        """

        payload = {
            "model": "meta/llama-3.1-70b-instruct",  # Adjust model name as needed
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 1024,
            "stream": False,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    LLMService.CHAT_URL,
                    json=payload,
                    headers=headers,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]

                # Cleanup potential markdown ticks if LLM performs poorly
                clean_content = (
                    content.replace("```json", "").replace("```", "").strip()
                )

                parsed = json.loads(clean_content)
                return GraphData(**parsed)

            except Exception as e:
                print(f"Error calling NVIDIA Chat API or parsing: {e}")
                # Fallback on error
                return GraphData(events=[], emotions=[])


llm_service = LLMService()
