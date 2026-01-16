import httpx
import json

# 1. 로그인
login_response = httpx.post(
    'http://127.0.0.1:8000/api/auth/login/',
    json={'login_id': 'admin', 'password': 'admin'}
)
print(f"Login status: {login_response.status_code}")
tokens = login_response.json()
access_token = tokens['access']
print(f"Access token: {access_token[:50]}...")

# 2. M1 추론 요청
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

# OCS ID 8 사용 (study_uid: 1.2.410.200001.0008.202600008.20260116152428)
m1_request = {
    'ocs_id': 8,
    'mode': 'auto'  # auto mode - no websocket events
}

print(f"\nRequesting M1 inference for OCS ID: {m1_request['ocs_id']}")
print(f"Mode: {m1_request['mode']}")

m1_response = httpx.post(
    'http://127.0.0.1:8000/api/ai/m1/inference/',
    json=m1_request,
    headers=headers,
    timeout=30.0
)

print(f"\nM1 Response status: {m1_response.status_code}")
print(f"M1 Response: {json.dumps(m1_response.json(), indent=2, ensure_ascii=False)}")
