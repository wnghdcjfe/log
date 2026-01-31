import subprocess
import time
import requests
import sys
import os
import signal


def run_server():
    # Start uvicorn server in background
    # Assuming this script is run from backend/tests, so backend root is ..
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    print(f"Backend root: {backend_root}")

    process = subprocess.Popen(
        ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        preexec_fn=os.setsid,  # Create new process group
    )
    return process


def wait_for_server(url, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        try:
            requests.get(url)
            print("Server is up!")
            return True
        except requests.ConnectionError:
            time.sleep(1)
            print("Waiting for server...")
    return False


def test_question_api():
    url = "http://127.0.0.1:8000/api/v1/question"
    payload = {"userId": "test_user_ingest", "text": "What did I do yesterday?"}

    print(f"Sending request to {url} with payload: {payload}")
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.json()}")

        if response.status_code == 200:
            print("SUCCESS: API returned 200 OK")
        else:
            print("FAILURE: API returned non-200 code")

    except Exception as e:
        print(f"Error calling API: {e}")


if __name__ == "__main__":
    server_process = None
    server_url = "http://127.0.0.1:8000/"

    try:
        requests.get(server_url)
        print("Server already running.")
        test_question_api()
    except requests.ConnectionError:
        print("Starting server...")
        server_process = run_server()
        if not wait_for_server(server_url):
            print("Could not start server.")
            # Read stderr
            _, stderr = server_process.communicate()
            print(f"Server stderr: {stderr.decode()}")
            if server_process:
                os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)
            sys.exit(1)

        test_question_api()

        if server_process:
            print("Stopping server...")
            os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)
