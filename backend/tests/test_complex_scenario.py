import requests
import json
import time
import os
import subprocess
import signal
import sys


def run_complex_test():
    url_base = "http://127.0.0.1:8002/api/v1"

    # 1. 서버 시작 (포트 8002)
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    server_process = subprocess.Popen(
        ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8002"],
        cwd=backend_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        preexec_fn=os.setsid,
    )

    print("🚀 복합 시나리오 서버 시작 중...")
    time.sleep(5)

    try:
        user_id = "path_test_user"

        # 2. 인과 관계가 있는 3개의 기록 삽입
        records = [
            {
                "userId": user_id,
                "title": "중요 프로젝트 발표",
                "content": "오늘 회사에서 한 달간 준비한 프로젝트 발표를 무사히 마쳤다. 준비한 만큼 성과가 좋아서 다행이다.",
                "feel": ["안도", "성취감"],
                "date": "2026-02-01",
            },
            {
                "userId": user_id,
                "title": "팀장님의 칭찬과 자신감",
                "content": "프로젝트 발표 결과가 좋아서 팀장님이 전 팀원 앞에서 나를 칭찬해주셨다. 동료들에게 인정받으니 자신감이 크게 생겼다.",
                "feel": ["자신감", "기쁨"],
                "date": "2026-02-02",
            },
            {
                "userId": user_id,
                "title": "새로운 도전",
                "content": "어제 얻은 자신감 덕분에, 평소라면 부담스러워했을 기술 세미나 발표를 내가 하겠다고 자원했다. 잘 할 수 있을 것 같다.",
                "feel": ["설렘", "의욕"],
                "date": "2026-02-03",
            },
        ]

        print("\n📥 인과 관계 데이터 삽입 중...")
        for r in records:
            res = requests.post(f"{url_base}/records", json=r)
            print(f"  - '{r['title']}' 삽입 완료 (ID: {res.json().get('recordId')})")
            time.sleep(1)  # 인덱싱 및 그래프 처리를 위한 간격

        # 3. 데이터가 안정화될 때까지 대기
        print("\n⏳ 그래프 컨텍스트 형성 대기 중 (5초)...")
        time.sleep(5)

        # 4. 복합 질문 던지기
        question_payload = {
            "userId": user_id,
            "text": "내가 새로운 세미나 발표를 맡겠다고 결심하게 된 근본적인 이유가 뭐야? 그리고 프로젝트 성공부터 지금까지 내 감정이 어떻게 변해왔는지 연결해서 설명해줘.",
        }

        print("\n" + "=" * 80)
        print(f"❓ 복합 질문: {question_payload['text']}")
        print("=" * 80)

        start_time = time.time()
        response = requests.post(f"{url_base}/question", json=question_payload)
        end_time = time.time()

        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ 답변:\n{result['answer']}")
            print(f"\n📊 신뢰도: {result['confidence']}")
            print(
                f"\n🧠 추론 근거(Reasoning Path):\n{result['reasoningPath']['summary']}"
            )
            print(
                f"\n🌐 활용된 그래프 정보 (노드: {result['reasoningPath']['graph_snapshot']['node_count']}개, 엣지: {result['reasoningPath']['graph_snapshot']['edge_count']}개)"
            )
        else:
            print(f"❌ 에러 발생: {response.text}")

    finally:
        print("\n🛑 테스트 서버 종료...")
        os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)


if __name__ == "__main__":
    run_complex_test()
