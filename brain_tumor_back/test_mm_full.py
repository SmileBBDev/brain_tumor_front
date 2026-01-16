import httpx
import json
import time
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.ocs.models import OCS
from apps.accounts.models import User
from apps.ai_inference.models import AIInference

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

# 2. M1, MG 완료된 추론 확인
m1_inference = AIInference.objects.filter(
    model_type='M1',
    status='COMPLETED'
).order_by('-completed_at').first()

mg_inference = AIInference.objects.filter(
    model_type='MG',
    status='COMPLETED'
).order_by('-completed_at').first()

if not m1_inference:
    print("ERROR: M1 추론 완료 결과가 없습니다. 먼저 M1 테스트를 실행하세요.")
    exit(1)

if not mg_inference:
    print("ERROR: MG 추론 완료 결과가 없습니다. 먼저 MG 테스트를 실행하세요.")
    exit(1)

print(f"\nM1 Inference: job_id={m1_inference.job_id}, mri_ocs_id={m1_inference.mri_ocs_id}")
print(f"MG Inference: job_id={mg_inference.job_id}, rna_ocs_id={mg_inference.rna_ocs_id}")

# 3. MM 추론 요청
mm_request = {
    'mri_ocs_id': m1_inference.mri_ocs_id,
    'gene_ocs_id': mg_inference.rna_ocs_id,
    'mode': 'auto'
}

print(f"\n{'='*60}")
print(f"Requesting MM inference")
print(f"  MRI OCS ID: {mm_request['mri_ocs_id']}")
print(f"  Gene OCS ID: {mm_request['gene_ocs_id']}")
print(f"  Mode: {mm_request['mode']}")
print(f"{'='*60}")

mm_response = httpx.post(
    'http://127.0.0.1:8000/api/ai/mm/inference/',
    json=mm_request,
    headers=headers,
    timeout=60.0
)

print(f"\nMM Response status: {mm_response.status_code}")
response_data = mm_response.json()
print(f"MM Response: {json.dumps(response_data, indent=2, ensure_ascii=False)}")

if mm_response.status_code == 200 or mm_response.status_code == 201:
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
