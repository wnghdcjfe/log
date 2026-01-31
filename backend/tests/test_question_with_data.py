import subprocess
import time
import requests
import sys
import os
import signal


def run_server():
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    print(f"Backend root: {backend_root}")

    process = subprocess.Popen(
        ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        preexec_fn=os.setsid,
    )
    return process


def wait_for_server(url, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        try:
            requests.get(url)
            print("서버 시작 완료!")
            return True
        except requests.ConnectionError:
            time.sleep(1)
            print("서버 시작 대기 중...")
    return False


def insert_test_record():
    """테스트용 일기 데이터 삽입"""
    url = "http://127.0.0.1:8000/api/v1/records"
    payload = {
        "userId": "test_user_123",
        "title": "민수와 만남",
        "content": "오늘은 친구 민수와 강남에서 만나서 맛있는 파스타를 먹었다. 정말 행복했고, 내일은 영화를 보러 가기로 했다.",
        "feel": ["행복", "즐거움"],
        "date": "2026-01-31",
    }

    print(f"\n📝 테스트 레코드 삽입 중...")
    print(f"URL: {url}")
    print(f"Payload: {payload}")

    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")

        if response.status_code in [200, 201]:
            print("✅ 레코드 삽입 성공!")
            return True
        else:
            print("❌ 레코드 삽입 실패!")
            return False
    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        return False


def test_question_api():
    """질문 API 테스트"""
    url = "http://127.0.0.1:8000/api/v1/question"

    # 테스트할 질문들
    questions = ["오늘 누구랑 만났어?", "오늘 뭐 먹었어?", "내일 뭐 할 예정이야?"]

    for question_text in questions:
        payload = {"userId": "test_user_123", "text": question_text}

        print(f"\n❓ 질문: {question_text}")
        print(f"URL: {url}")

        try:
            response = requests.post(url, json=payload)
            print(f"Status Code: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                print(f"\n✅ 답변: {result['answer']}")
                print(f"📊 신뢰도: {result['confidence']}")
                print(f"🧠 추론 경로: {result['reasoningPath'].get('summary', 'N/A')}")
                print(
                    f"📚 사용된 레코드 수: {len(result['reasoningPath'].get('records', []))}"
                )
                print(
                    f"🌐 그래프 노드 수: {result['reasoningPath']['graph_snapshot']['node_count']}"
                )
            else:
                print(f"❌ 에러: {response.json()}")

        except Exception as e:
            print(f"❌ API 호출 에러: {e}")

        print("\n" + "=" * 80)


if __name__ == "__main__":
    server_process = None
    server_url = "http://127.0.0.1:8000/"

    try:
        # 서버가 이미 실행 중인지 확인
        try:
            requests.get(server_url)
            print("서버가 이미 실행 중입니다.")
        except requests.ConnectionError:
            print("서버 시작 중...")
            server_process = run_server()
            if not wait_for_server(server_url):
                print("서버를 시작할 수 없습니다.")
                if server_process:
                    os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)
                sys.exit(1)

        # 테스트 데이터 삽입
        if not insert_test_record():
            print("⚠️  데이터 삽입에 실패했지만 질문 테스트는 계속 진행합니다.")

        # 데이터가 인덱싱될 시간을 줍니다
        print("\n⏳ 데이터 인덱싱 대기 중 (3초)...")
        time.sleep(3)

        # 질문 API 테스트
        test_question_api()

    finally:
        # 서버 종료
        if server_process:
            print("\n서버 종료 중...")
            os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)
