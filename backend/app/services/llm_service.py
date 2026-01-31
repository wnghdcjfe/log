import httpx
from typing import List
from app.core.config import get_settings

settings = get_settings()


class LLMService:
    """
    Service to interact with NVIDIA NeMo / NVIDIA NIM APIs.
    Currently focuses on Embedding Generation.
    """

    # Example Endpoint for NVIDIA Embeddings (Replace with actual endpoint if different)
    # Using a common placeholder endpoint for NVIDIA NIM
    EMBEDDING_URL = "https://integrate.api.nvidia.com/v1/embeddings"

    @staticmethod
    async def get_embedding(text: str) -> List[float]:
        """
        Generate embedding for the given text using NVIDIA NeMo.
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
                # Fallback to mock for stability during dev if API fails
                return [0.0] * 1024


llm_service = LLMService()
