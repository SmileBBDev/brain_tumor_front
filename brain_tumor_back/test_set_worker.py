import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.ocs.models import OCS
from apps.accounts.models import User

# Get admin user
admin = User.objects.get(login_id='admin')
print(f"Admin user: {admin.id} - {admin.login_id}")

# Get OCS 8 and set worker to admin
ocs = OCS.objects.get(id=8)
print(f"OCS {ocs.id} - current worker: {ocs.worker}, doctor: {ocs.doctor}")

ocs.worker = admin
ocs.save()
print(f"OCS {ocs.id} - updated worker: {ocs.worker}")
