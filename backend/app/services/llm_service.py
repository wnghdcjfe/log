import httpx
import json
from typing import List, Optional, Protocol, runtime_checkable
from abc import ABC, abstractmethod

from app.models.domain.graph import GraphData, GraphEvent
from app.core.config import get_settings

settings = get_settings()


class LLMServiceInterface(ABC):
    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        pass

    @abstractmethod
    async def generate_graph_cypher(
        self, text: str, user_id: str, record_id: str, date: str
    ) -> str:
        pass

    @abstractmethod
    async def generate_answer_with_reasoning(
        self, question: str, context_records: List[dict], context_graph: dict
    ) -> dict:
        pass

    @abstractmethod
    async def extract_entities(self, text: str) -> GraphData:
        pass

    @abstractmethod
    async def rerank(
        self, query: str, documents: List[dict], top_k: int = 5
    ) -> List[dict]:
        """
        검색 결과를 질문과의 관련성에 따라 재순위화.

        Args:
            query: 사용자 질문
            documents: 검색된 문서 리스트 (각 문서는 'content' 필드 필요)
            top_k: 반환할 상위 문서 수

        Returns:
            재순위화된 문서 리스트 (relevance_score 필드 추가됨)
        """
        pass


class NvidiaLLMService(LLMServiceInterface):
    """
    NVIDIA NeMo / NVIDIA NIM API Service
    """

    EMBEDDING_URL = "https://integrate.api.nvidia.com/v1/embeddings"
    CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

    async def get_embedding(self, text: str) -> List[float]:
        if not settings.NVIDIA_API_KEY:
            print("WARNING: NVIDIA_API_KEY not set. Returning mock embedding.")
            return [0.0] * 1024

        headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        payload = {
            "input": text,
            "model": "nvidia/nv-embed-v1",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.EMBEDDING_URL,
                    json=payload,
                    headers=headers,
                    timeout=10.0,
                )
                response.raise_for_status()
                data = response.json()
                return data["data"][0]["embedding"]
            except Exception as e:
                print(f"Error calling NVIDIA API: {e}")
                return [0.0] * 1024

    async def generate_graph_cypher(
        self, text: str, user_id: str, record_id: str, date: str
    ) -> str:
        headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # Shared Schema Description
        schema_desc = self._get_schema_description()

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
            "temperature": 0.1,
            "max_tokens": 2048,
            "stream": False,
        }

        content = await self._call_chat_api(headers, payload)
        clean_content = content.replace("```cypher", "").replace("```", "").strip()
        return clean_content

    async def generate_answer_with_reasoning(
        self, question: str, context_records: List[dict], context_graph: dict
    ) -> dict:
        if not settings.NVIDIA_API_KEY:
            return self._mock_reasoning_response()

        headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        records_text, graph_text = self._format_context(context_records, context_graph)
        prompt = self._get_reasoning_prompt(question, records_text, graph_text)

        payload = {
            "model": "meta/llama-3.1-70b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 1024,
            "stream": False,
        }

        try:
            content = await self._call_chat_api(headers, payload)
            clean_content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_content)
        except Exception as e:
            print(f"Error generating answer: {e}")
            return {
                "answer": "Error generating answer",
                "confidence": 0.0,
                "reasoning_summary": str(e),
            }

    async def extract_entities(self, text: str) -> GraphData:
        if not settings.NVIDIA_API_KEY:
            return self._mock_graph_data()

        headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        prompt = self._get_extraction_prompt(text)

        payload = {
            "model": "meta/llama-3.1-70b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 1024,
            "stream": False,
        }

        try:
            content = await self._call_chat_api(headers, payload)
            clean_content = content.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(clean_content)
            return GraphData(**parsed)
        except Exception as e:
            print(f"Entities extraction error: {e}")
            return GraphData(events=[], emotions=[])

    # --- Helpers ---
    async def _call_chat_api(self, headers: dict, payload: dict) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.CHAT_URL, json=payload, headers=headers, timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    def _get_schema_description(self):
        return """
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

    def _format_context(self, context_records, context_graph):
        records_text = "\n".join(
            [f"- [{r.get('recordId')}] {r.get('content')}" for r in context_records]
        )
        graph_text = str(context_graph)
        return records_text, graph_text

    def _get_reasoning_prompt(self, question, records_text, graph_text):
        return f"""
        너는 사용자의 개인 기억을 함께 떠올려주는 친한 친구야.
        모든 답변은 반말로 친근하고 따뜻하게 해줘. 딱딱한 존댓말은 사용하지 마.

        질문: "{question}"

        관련된 일기 기록들 (Vector Memory):
        {records_text}

        기록들과 연결된 지식 그래프 컨텍스트 (Graph Memory):
        {graph_text}

        지침:
        1. 제공된 컨텍스트만을 기반으로 자연스럽고 친근하게 답변해줘.
        2. 컨텍스트에 답이 없으면 솔직하게 "음, 그건 기억에 없는 것 같아" 같은 식으로 말해줘.
        3. 어떻게 답변을 도출했는지 추론 과정도 친근하게 설명해줘.

        출력 형식 (JSON):
        {{
            "answer": "친근한 반말 답변...",
            "confidence": 0.9,
            "reasoning_summary": "답변을 어떻게 찾았는지 친근하게 설명..."
        }}
        """

    def _get_extraction_prompt(self, text):
        return f"""
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

    def _mock_reasoning_response(self):
        return {
            "answer": "This is a mock answer because API Key is missing.",
            "confidence": 0.0,
            "reasoning_summary": "Mock reasoning.",
        }

    def _mock_graph_data(self):
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

    async def rerank(
        self, query: str, documents: List[dict], top_k: int = 5
    ) -> List[dict]:
        """
        LLM 기반 Reranking: 질문과 각 문서의 관련성을 평가하여 재순위화.
        """
        if not documents:
            return []

        if not settings.NVIDIA_API_KEY:
            print("WARNING: NVIDIA_API_KEY not set. Returning original order.")
            return documents[:top_k]

        headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # 문서들을 번호와 함께 포맷팅
        docs_text = "\n".join(
            [
                f"[문서 {i+1}] {doc.get('title', '제목 없음')}: {doc.get('content', '')[:500]}"
                for i, doc in enumerate(documents)
            ]
        )

        prompt = f"""
        당신은 검색 결과의 관련성을 평가하는 전문가입니다.

        사용자 질문: "{query}"

        다음 문서들의 질문에 대한 관련성을 0.0~1.0 점수로 평가하세요.

        문서 목록:
        {docs_text}

        각 문서에 대해 관련성 점수를 매기고, JSON 형식으로만 응답하세요.
        관련성이 높을수록 1.0에 가깝고, 관련 없으면 0.0에 가깝습니다.

        출력 형식 (JSON만, 다른 텍스트 없이):
        {{
            "scores": [0.9, 0.7, 0.3, ...]
        }}
        """

        payload = {
            "model": "meta/llama-3.1-70b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 256,
            "stream": False,
        }

        try:
            content = await self._call_chat_api(headers, payload)
            clean_content = content.replace("```json", "").replace("```", "").strip()
            result = json.loads(clean_content)
            scores = result.get("scores", [])

            # 점수를 문서에 추가하고 정렬
            scored_docs = []
            for i, doc in enumerate(documents):
                doc_copy = doc.copy()
                doc_copy["relevance_score"] = scores[i] if i < len(scores) else 0.0
                scored_docs.append(doc_copy)

            # 관련성 점수로 내림차순 정렬
            scored_docs.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
            print(f"[Rerank] Reranked {len(documents)} documents")
            return scored_docs[:top_k]

        except Exception as e:
            print(f"[Rerank] Error during reranking: {e}, returning original order")
            return documents[:top_k]


class OpenAILLMService(NvidiaLLMService):
    """
    OpenAI-based LLM Service.
    Inherits helpers from NvidiaLLMService since prompts and logic are largely compatible.
    """

    EMBEDDING_URL = "https://api.openai.com/v1/embeddings"
    CHAT_URL = "https://api.openai.com/v1/chat/completions"

    async def get_embedding(self, text: str) -> List[float]:
        if not settings.OPENAI_API_KEY:
            print("WARNING: OPENAI_API_KEY not set. Returning mock embedding.")
            return [0.0] * 1536  # OpenAI embeddings are usually 1536 dims

        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }

        payload = {
            "input": text,
            "model": settings.OPENAI_EMBEDDING_MODEL,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.EMBEDDING_URL,
                    json=payload,
                    headers=headers,
                    timeout=10.0,
                )
                response.raise_for_status()
                data = response.json()
                return data["data"][0]["embedding"]
            except Exception as e:
                print(f"Error calling OpenAI Embeddings: {e}")
                return [0.0] * 1536

    async def _call_chat_api(self, headers: dict, payload: dict) -> str:
        # Override to use OpenAI URL and potentially adjust payload if needed
        # OpenAI payload is compatible with what we constructed in base class,
        # but we need to ensure the headers use the OpenAI Key.

        # We also need to swap the model name in payload if it's currently hardcoded to Llama
        payload["model"] = settings.OPENAI_MODEL_NAME

        # Ensure headers are for OpenAI
        openai_headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.CHAT_URL, json=payload, headers=openai_headers, timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def generate_answer_with_reasoning(
        self, question: str, context_records: List[dict], context_graph: dict
    ) -> dict:
        if not settings.OPENAI_API_KEY:
            return self._mock_reasoning_response()

        records_text, graph_text = self._format_context(context_records, context_graph)
        prompt = self._get_reasoning_prompt(question, records_text, graph_text)

        payload = {
            "model": settings.OPENAI_MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 1024,
            "stream": False,
        }

        try:
            content = await self._call_chat_api({}, payload)
            clean_content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_content)
        except Exception as e:
            print(f"Error generating answer: {e}")
            return {
                "answer": "Error generating answer",
                "confidence": 0.0,
                "reasoning_summary": str(e),
            }

    async def extract_entities(self, text: str) -> GraphData:
        if not settings.OPENAI_API_KEY:
            return self._mock_graph_data()

        prompt = self._get_extraction_prompt(text)

        payload = {
            "model": settings.OPENAI_MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 1024,
            "stream": False,
        }

        try:
            content = await self._call_chat_api({}, payload)
            clean_content = content.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(clean_content)
            return GraphData(**parsed)
        except Exception as e:
            print(f"Entities extraction error: {e}")
            return GraphData(events=[], emotions=[])

    async def rerank(
        self, query: str, documents: List[dict], top_k: int = 5
    ) -> List[dict]:
        """
        OpenAI 기반 Reranking: 질문과 각 문서의 관련성을 평가하여 재순위화.
        """
        if not documents:
            return []

        if not settings.OPENAI_API_KEY:
            print("WARNING: OPENAI_API_KEY not set. Returning original order.")
            return documents[:top_k]

        # 문서들을 번호와 함께 포맷팅
        docs_text = "\n".join(
            [
                f"[문서 {i+1}] {doc.get('title', '제목 없음')}: {doc.get('content', '')[:500]}"
                for i, doc in enumerate(documents)
            ]
        )

        prompt = f"""
        당신은 검색 결과의 관련성을 평가하는 전문가입니다.

        사용자 질문: "{query}"

        다음 문서들의 질문에 대한 관련성을 0.0~1.0 점수로 평가하세요.

        문서 목록:
        {docs_text}

        각 문서에 대해 관련성 점수를 매기고, JSON 형식으로만 응답하세요.
        관련성이 높을수록 1.0에 가깝고, 관련 없으면 0.0에 가깝습니다.

        출력 형식 (JSON만, 다른 텍스트 없이):
        {{
            "scores": [0.9, 0.7, 0.3, ...]
        }}
        """

        payload = {
            "model": settings.OPENAI_MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 256,
            "stream": False,
        }

        try:
            content = await self._call_chat_api({}, payload)
            clean_content = content.replace("```json", "").replace("```", "").strip()
            result = json.loads(clean_content)
            scores = result.get("scores", [])

            # 점수를 문서에 추가하고 정렬
            scored_docs = []
            for i, doc in enumerate(documents):
                doc_copy = doc.copy()
                doc_copy["relevance_score"] = scores[i] if i < len(scores) else 0.0
                scored_docs.append(doc_copy)

            # 관련성 점수로 내림차순 정렬
            scored_docs.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
            print(f"[Rerank] Reranked {len(documents)} documents")
            return scored_docs[:top_k]

        except Exception as e:
            print(f"[Rerank] Error during reranking: {e}, returning original order")
            return documents[:top_k]


def get_llm_service() -> LLMServiceInterface:
    if settings.LLM_PROVIDER == "openai":
        return OpenAILLMService()
    else:
        return NvidiaLLMService()


# Singleton Instance
llm_service = get_llm_service()
