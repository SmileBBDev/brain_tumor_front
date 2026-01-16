import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.ocs.models import OCS

# Find MRI OCS with DICOM study_uid
ocs_list = OCS.objects.filter(job_role='RIS', job_type='MRI').order_by('-id')[:10]
print(f"Found {ocs_list.count()} MRI OCS records")
for ocs in ocs_list:
    worker_result = ocs.worker_result or {}
    dicom_info = worker_result.get('dicom', {})
    study_uid = dicom_info.get('study_uid', 'N/A')
    print(f"OCS ID: {ocs.id}, Patient: {ocs.patient.id if ocs.patient else 'N/A'}, Study UID: {study_uid}")
