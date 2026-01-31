import requests
import json
import time
import os
import subprocess
import signal
import sys


def run_actual_test():
    url = "http://127.0.0.1:8001/api/v1/question"

    # 1. 벡엔드 서버 시작 (포트 8001 사용 - 충돌 방지)
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    server_process = subprocess.Popen(
        ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"],
        cwd=backend_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        preexec_fn=os.setsid,
    )

    print("🚀 서버 시작 중 (127.0.0.1:8001)...")
    time.sleep(5)  # 서버가 완전히 뜰 때까지 대기

    try:
        # 테스트 데이터 (이미 이전 테스트에서 삽입된 데이터 유지됨)
        payload = {
            "userId": "test_user_123",
            "text": "오늘 누구랑 만났고 뭐 먹었는지 알려줘.",
        }

        print("\n" + "=" * 50)
        print("📡 [REQUEST] POST /api/v1/question")
        print("Header: Content-Type: application/json")
        print(f"Body: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        print("=" * 50)

        start_time = time.time()
        response = requests.post(url, json=payload)
        end_time = time.time()

        print(f"\n⏱️  소요 시간: {end_time - start_time:.2f}초")
        print("\n" + "=" * 50)
        print(f"📥 [RESPONSE] Status: {response.status_code}")

        if response.status_code == 200:
            print(f"Body: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        else:
            print(f"Error: {response.text}")
        print("=" * 50)

    finally:
        print("\n🛑 서버 종료 중...")
        os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)


if __name__ == "__main__":
    run_actual_test()
