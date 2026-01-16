import httpx
import json
import time
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.ocs.models import OCS
from apps.accounts.models import User

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

# 2. OCS 16 확인 및 worker 설정
system_user = User.objects.get(login_id='system')

# ocs_id가 'ocs_0016'인 OCS 찾기
try:
    ocs = OCS.objects.get(ocs_id='ocs_0016')
    print(f"Found OCS: id={ocs.id}, ocs_id={ocs.ocs_id}, job_role={ocs.job_role}, job_type={ocs.job_type}")
except OCS.DoesNotExist:
    print("OCS with ocs_id='ocs_0016' not found")
    # LIS OCS 목록 확인
    lis_ocs_list = OCS.objects.filter(job_role='LIS').order_by('-id')[:5]
    print(f"\nLIS OCS 목록:")
    for o in lis_ocs_list:
        print(f"  id={o.id}, ocs_id={o.ocs_id}, job_role={o.job_role}")
    exit(1)

# worker 설정
ocs.worker = system_user
ocs.save()
print(f"OCS {ocs.ocs_id} worker set to: {ocs.worker}")

# 3. MG 추론 요청
mg_request = {
    'ocs_id': ocs.id,  # 실제 DB id 사용
    'mode': 'auto'
}

print(f"\n{'='*60}")
print(f"Requesting MG inference for OCS ID: {ocs.id} (ocs_id: {ocs.ocs_id})")
print(f"Mode: {mg_request['mode']}")
print(f"{'='*60}")

mg_response = httpx.post(
    'http://127.0.0.1:8000/api/ai/mg/inference/',
    json=mg_request,
    headers=headers,
    timeout=30.0
)

print(f"\nMG Response status: {mg_response.status_code}")
response_data = mg_response.json()
print(f"MG Response: {json.dumps(response_data, indent=2, ensure_ascii=False)}")

if mg_response.status_code == 200 or mg_response.status_code == 201:
    job_id = response_data.get('job_id')
    print(f"\nJob ID: {job_id}")

    # 4. 추론 상태 폴링
    print("\nPolling for inference status...")
    for i in range(30):  # 최대 60초 대기
        time.sleep(2)
        status_response = httpx.get(
            f'http://127.0.0.1:8000/api/ai/inferences/{job_id}/',
            headers=headers,
            timeout=30.0
        )
        status_data = status_response.json()
        status = status_data.get('status')
        print(f"  [{i*2}s] Status: {status}")

        if status in ['COMPLETED', 'completed', 'FAILED', 'failed']:
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
