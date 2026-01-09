#!/usr/bin/env python
"""
NURSE_RECEPTION 메뉴 추가 스크립트
- /nurse/reception 페이지용
- 간호사용 진료 접수 현황 페이지
"""
import os
import sys
import django

# Django 설정
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.menus.models import Menu, MenuPermission, MenuLabel
from apps.accounts.models import Permission, Role


def add_nurse_reception_menu():
    """NURSE_RECEPTION 메뉴 추가"""
    print("="*60)
    print("NURSE_RECEPTION 메뉴 추가 스크립트")
    print("="*60)

    code = 'NURSE_RECEPTION'

    # 1. 메뉴 생성/업데이트
    menu, created = Menu.objects.update_or_create(
        code=code,
        defaults={
            'path': '/nurse/reception',
            'icon': 'clipboard-list',
            'order': 30,  # 환자관리 다음 순서
            'is_active': True,
            'breadcrumb_only': False,
            'parent': None,  # 최상위 메뉴
        }
    )
    print(f"[{'CREATE' if created else 'UPDATE'}] Menu: {code}")

    # 2. 권한 생성/업데이트
    permission, created = Permission.objects.update_or_create(
        code=code,
        defaults={
            'name': '진료 접수 현황',
            'description': '간호사용 진료 접수 현황 페이지 접근 권한',
        }
    )
    print(f"[{'CREATE' if created else 'UPDATE'}] Permission: {code}")

    # 3. 메뉴-권한 연결
    MenuPermission.objects.get_or_create(menu=menu, permission=permission)
    print(f"[OK] MenuPermission: {code}")

    # 4. 역할-권한 연결
    roles_to_add = ['SYSTEMMANAGER', 'ADMIN', 'NURSE']
    for role_code in roles_to_add:
        try:
            role = Role.objects.get(code=role_code)
            role.permissions.add(permission)
            print(f"  - Role '{role_code}' <- Permission '{code}'")
        except Role.DoesNotExist:
            print(f"  - [SKIP] Role '{role_code}' 없음")

    # 5. 메뉴 라벨 추가
    MenuLabel.objects.get_or_create(
        menu=menu,
        role='DEFAULT',
        defaults={'text': '진료 접수 현황'}
    )
    print(f"[OK] MenuLabel: {code}")

    # NURSE 역할 전용 라벨
    MenuLabel.objects.update_or_create(
        menu=menu,
        role='NURSE',
        defaults={'text': '진료 접수'}
    )
    print(f"[OK] MenuLabel (NURSE): {code}")

    print("\n" + "="*60)
    print("[완료] NURSE_RECEPTION 메뉴 추가 완료")
    print("="*60)


if __name__ == '__main__':
    add_nurse_reception_menu()
