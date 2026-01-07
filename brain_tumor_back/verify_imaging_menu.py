#!/usr/bin/env python
"""Verify imaging menu structure"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.menus.models import Menu, MenuLabel, MenuPermission
from apps.accounts.models import Permission, Role, RolePermission

print("=" * 60)
print("IMAGING MENU STRUCTURE VERIFICATION")
print("=" * 60)

# Get IMAGING parent menu
imaging = Menu.objects.get(menu_id='IMAGING')
print(f"\nParent Menu:")
print(f"  ID: {imaging.menu_id}")
print(f"  Path: {imaging.path}")
print(f"  Parent: {imaging.parent}")
print(f"  Order: {imaging.order}")

# Get child menus
children = Menu.objects.filter(parent=imaging).order_by('order')
print(f"\nChild Menus ({children.count()}):")
for child in children:
    print(f"  - {child.menu_id}")
    print(f"    Path: {child.path}")
    print(f"    Order: {child.order}")
    print(f"    Active: {child.is_active}")

# Get menu labels
print("\n" + "=" * 60)
print("MENU LABELS")
print("=" * 60)

all_menus = [imaging] + list(children)
for menu in all_menus:
    labels = MenuLabel.objects.filter(menu=menu)
    print(f"\n{menu.menu_id}:")
    for label in labels:
        print(f"  [{label.role}] {label.text}")

# Get permissions
print("\n" + "=" * 60)
print("MENU PERMISSIONS")
print("=" * 60)

for menu in all_menus:
    perms = MenuPermission.objects.filter(menu=menu)
    print(f"\n{menu.menu_id}:")
    for mp in perms:
        print(f"  - {mp.permission.code}: {mp.permission.name}")

# Get RIS role permissions
print("\n" + "=" * 60)
print("RIS ROLE PERMISSIONS")
print("=" * 60)

try:
    ris_role = Role.objects.get(code='RIS')
    role_perms = RolePermission.objects.filter(role=ris_role, menu__in=all_menus)
    print(f"\nRIS role has {role_perms.count()} imaging permissions:")
    for rp in role_perms:
        menu_text = f" (Menu: {rp.menu.menu_id})" if rp.menu else ""
        print(f"  - {rp.permission.code}{menu_text}")
except Role.DoesNotExist:
    print("\nRIS role not found!")

print("\n" + "=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)
