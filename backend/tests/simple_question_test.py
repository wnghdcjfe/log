"""
간단한 Question API 테스트 (서버는 별도로 실행)
"""

import requests


def test_question():
    url = "http://127.0.0.1:8000/api/v1/question"
    payload = {"userId": "test_user_123", "text": "오늘 누구랑 만났어?"}

    print(f"Sending request to {url}")
    print(f"Payload: {payload}")

    response = requests.post(url, json=payload)
    print(f"\nStatus: {response.status_code}")
    result = response.json()

    print(f"\n답변: {result['answer']}")
    print(f"신뢰도: {result['confidence']}")
    print(f"레코드 수: {len(result['reasoningPath'].get('records', []))}")
    print(f"그래프 노드 수: {result['reasoningPath']['graph_snapshot']['node_count']}")
    print(f"그래프 엣지 수: {result['reasoningPath']['graph_snapshot']['edge_count']}")


if __name__ == "__main__":
    test_question()
