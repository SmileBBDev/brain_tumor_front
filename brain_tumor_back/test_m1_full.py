import httpx
import json
import time

# 1. 로그인 (system 계정)
login_response = httpx.post(
    'http://127.0.0.1:8000/api/auth/login/',
    json={'login_id': 'system', 'password': 'system001'}
)
print(f"Login status: {login_response.status_code}")
if login_response.status_code != 200:
    print(f"Login failed: {login_response.text}")
    exit(1)

tokens = login_response.json()
access_token = tokens['access']
print(f"Access token: {access_token[:50]}...")

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

# 2. OCS 8의 worker를 system으로 설정
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.ocs.models import OCS
from apps.accounts.models import User

system_user = User.objects.get(login_id='system')
ocs = OCS.objects.get(id=8)
ocs.worker = system_user
ocs.save()
print(f"OCS {ocs.id} worker set to: {ocs.worker}")

# 3. M1 추론 요청
m1_request = {
    'ocs_id': 8,
    'mode': 'auto'  # auto mode - no websocket events
}

print(f"\n{'='*60}")
print(f"Requesting M1 inference for OCS ID: {m1_request['ocs_id']}")
print(f"Mode: {m1_request['mode']}")
print(f"{'='*60}")

m1_response = httpx.post(
    'http://127.0.0.1:8000/api/ai/m1/inference/',
    json=m1_request,
    headers=headers,
    timeout=30.0
)

print(f"\nM1 Response status: {m1_response.status_code}")
response_data = m1_response.json()
print(f"M1 Response: {json.dumps(response_data, indent=2, ensure_ascii=False)}")

if m1_response.status_code == 200 or m1_response.status_code == 201:
    job_id = response_data.get('job_id')
    print(f"\nJob ID: {job_id}")

    # 4. 추론 상태 폴링
    print("\nPolling for inference status...")
    for i in range(30):  # 최대 30초 대기
        time.sleep(2)
        status_response = httpx.get(
            f'http://127.0.0.1:8000/api/ai/inferences/{job_id}/',
            headers=headers,
            timeout=30.0
        )
        status_data = status_response.json()
        status = status_data.get('status')
        print(f"  [{i*2}s] Status: {status}")

        if status in ['completed', 'failed']:
            print(f"\nFinal result: {json.dumps(status_data, indent=2, ensure_ascii=False)}")
            break

    # 5. 결과 파일 목록 확인
    print("\n" + "="*60)
    print("Checking result files...")
    files_response = httpx.get(
        f'http://127.0.0.1:8000/api/ai/inferences/{job_id}/files/',
        headers=headers,
        timeout=30.0
    )
    if files_response.status_code == 200:
        files_data = files_response.json()
        print(f"Files: {json.dumps(files_data, indent=2, ensure_ascii=False)}")
    else:
        print(f"Files request failed: {files_response.status_code} - {files_response.text}")
