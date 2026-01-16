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

tokens = login_response.json()
access_token = tokens['access']
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

# 2. OCS 30 (환자 8의 RNA_SEQ) worker 설정
system_user = User.objects.get(login_id='system')
ocs = OCS.objects.get(id=30)
print(f"OCS: id={ocs.id}, ocs_id={ocs.ocs_id}, patient={ocs.patient}")
ocs.worker = system_user
ocs.save()

# 3. MG 추론 요청
mg_request = {'ocs_id': 30, 'mode': 'auto'}

print(f"\n{'='*60}")
print(f"Requesting MG inference for Patient 8 (손석희)")
print(f"  OCS ID: 30 (ocs_0030, RNA_SEQ)")
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

if mg_response.status_code == 200:
    job_id = response_data.get('job_id')
    print(f"\nJob ID: {job_id}")

    # 폴링
    print("\nPolling for inference status...")
    for i in range(15):
        time.sleep(2)
        status_response = httpx.get(
            f'http://127.0.0.1:8000/api/ai/inferences/{job_id}/',
            headers=headers,
            timeout=30.0
        )
        status_data = status_response.json()
        status = status_data.get('status')
        print(f"  [{i*2}s] Status: {status}")

        if status in ['COMPLETED', 'FAILED']:
            print(f"\nResult: {status}")
            break
