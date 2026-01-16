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

# 환자 9 (박민영) - MRI(9), RNA_SEQ(32), BIOMARKER(33)

# 1. 로그인
login_response = httpx.post(
    'http://127.0.0.1:8000/api/auth/login/',
    json={'login_id': 'system', 'password': 'system001'}
)
print(f"Login status: {login_response.status_code}")
tokens = login_response.json()
access_token = tokens['access']
headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}

system_user = User.objects.get(login_id='system')

# 2. OCS worker 설정
for ocs_id in [9, 32, 33]:
    ocs = OCS.objects.get(id=ocs_id)
    ocs.worker = system_user
    ocs.save()
    print(f"OCS {ocs_id} ({ocs.ocs_id}, {ocs.job_type}) worker set to system")

def poll_status(job_id, max_wait=60):
    for i in range(max_wait // 2):
        time.sleep(2)
        resp = httpx.get(f'http://127.0.0.1:8000/api/ai/inferences/{job_id}/', headers=headers, timeout=30.0)
        status = resp.json().get('status')
        print(f"  [{i*2}s] Status: {status}")
        if status in ['COMPLETED', 'FAILED']:
            return status
    return 'TIMEOUT'

# ============================================================
# 3. M1 추론 (MRI OCS 9)
# ============================================================
print(f"\n{'='*60}")
print("Step 1: M1 Inference (MRI)")
print(f"{'='*60}")

m1_resp = httpx.post('http://127.0.0.1:8000/api/ai/m1/inference/',
                      json={'ocs_id': 9, 'mode': 'auto'}, headers=headers, timeout=30.0)
print(f"M1 Response: {m1_resp.status_code} - {m1_resp.json()}")

if m1_resp.status_code == 200:
    m1_job_id = m1_resp.json().get('job_id')
    m1_status = poll_status(m1_job_id, max_wait=30)
    print(f"M1 Final Status: {m1_status}")
else:
    print("M1 Failed!")
    exit(1)

# ============================================================
# 4. MG 추론 (RNA_SEQ OCS 32)
# ============================================================
print(f"\n{'='*60}")
print("Step 2: MG Inference (RNA_SEQ)")
print(f"{'='*60}")

mg_resp = httpx.post('http://127.0.0.1:8000/api/ai/mg/inference/',
                      json={'ocs_id': 32, 'mode': 'auto'}, headers=headers, timeout=30.0)
print(f"MG Response: {mg_resp.status_code} - {mg_resp.json()}")

if mg_resp.status_code == 200:
    mg_job_id = mg_resp.json().get('job_id')
    mg_status = poll_status(mg_job_id, max_wait=30)
    print(f"MG Final Status: {mg_status}")
else:
    print("MG Failed!")
    exit(1)

# ============================================================
# 5. MM 추론 (MRI + RNA_SEQ + Protein)
# ============================================================
print(f"\n{'='*60}")
print("Step 3: MM Inference (Multimodal)")
print(f"{'='*60}")

mm_request = {
    'mri_ocs_id': 9,
    'gene_ocs_id': 32,
    'protein_ocs_id': 33,
    'mode': 'auto'
}
print(f"MM Request: {mm_request}")

mm_resp = httpx.post('http://127.0.0.1:8000/api/ai/mm/inference/',
                      json=mm_request, headers=headers, timeout=60.0)
print(f"MM Response: {mm_resp.status_code}")
print(f"MM Response Body: {json.dumps(mm_resp.json(), indent=2, ensure_ascii=False)}")

if mm_resp.status_code == 200:
    mm_job_id = mm_resp.json().get('job_id')
    mm_status = poll_status(mm_job_id, max_wait=60)
    print(f"MM Final Status: {mm_status}")

    # 결과 파일 확인
    files_resp = httpx.get(f'http://127.0.0.1:8000/api/ai/inferences/{mm_job_id}/files/',
                           headers=headers, timeout=30.0)
    print(f"\nMM Result Files: {json.dumps(files_resp.json(), indent=2, ensure_ascii=False)}")

# ============================================================
# 6. 최종 결과 요약
# ============================================================
print(f"\n{'='*60}")
print("Final Summary")
print(f"{'='*60}")

for inf in AIInference.objects.filter(patient__patient_number='P202600009').order_by('id'):
    print(f"  {inf.job_id}: {inf.model_type} - {inf.status}")
