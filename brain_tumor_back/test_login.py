import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User

# Check admin password
u = User.objects.get(login_id='admin')
print(f"Admin exists: {u.login_id}")
print(f"Password 'admin': {u.check_password('admin')}")
print(f"Password '1234': {u.check_password('1234')}")

# Reset password to admin
u.set_password('admin')
u.save()
print("Password reset to 'admin'")
print(f"Password 'admin' now: {u.check_password('admin')}")
