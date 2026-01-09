#!/usr/bin/env python
"""
OCS_LIS_DETAIL 메뉴 추가 스크립트
- /ocs/lis/:ocsId 상세 페이지용
- breadcrumb_only=True (사이드바에 표시 안 함)
- OCS_LIS의 자식 메뉴로 설정
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


def add_ocs_lis_detail():
    """OCS_LIS_DETAIL 메뉴 추가"""
    print("="*60)
    print("OCS_LIS_DETAIL 메뉴 추가 스크립트")
    print("="*60)

    # OCS_LIS 메뉴 찾기 (parent)
    try:
        ocs_lis_menu = Menu.objects.get(code='OCS_LIS')
        print(f"[OK] OCS_LIS 메뉴 찾음 (id={ocs_lis_menu.id})")
    except Menu.DoesNotExist:
        print("[ERROR] OCS_LIS 메뉴가 없습니다. add_ocs_menus.py를 먼저 실행하세요.")
        return

    code = 'OCS_LIS_DETAIL'

    # 1. 메뉴 생성/업데이트
    menu, created = Menu.objects.update_or_create(
        code=code,
        defaults={
            'path': '/ocs/lis/:ocsId',
            'icon': 'flask',
            'order': 1,
            'is_active': True,
            'breadcrumb_only': True,  # 사이드바에 표시 안 함
            'parent': ocs_lis_menu,
        }
    )
    print(f"[{'CREATE' if created else 'UPDATE'}] Menu: {code}")

    # 2. 권한 생성/업데이트
    permission, created = Permission.objects.update_or_create(
        code=code,
        defaults={
            'name': 'LIS 검사 상세',
            'description': 'LIS 검사 상세 페이지 접근 권한',
        }
    )
    print(f"[{'CREATE' if created else 'UPDATE'}] Permission: {code}")

    # 3. 메뉴-권한 연결
    MenuPermission.objects.get_or_create(menu=menu, permission=permission)
    print(f"[OK] MenuPermission: {code}")

    # 4. 역할-권한 연결 (OCS_LIS와 동일한 역할에 부여)
    roles_to_add = ['SYSTEMMANAGER', 'ADMIN', 'LIS']
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
        defaults={'text': 'LIS 검사 상세'}
    )
    print(f"[OK] MenuLabel: {code}")

    print("\n" + "="*60)
    print("[완료] OCS_LIS_DETAIL 메뉴 추가 완료")
    print("="*60)

    # 결과 확인
    print("\n[OCS 관련 메뉴 목록]")
    for m in Menu.objects.filter(code__startswith='OCS_').order_by('code'):
        parent_code = m.parent.code if m.parent else 'ROOT'
        print(f"  - {m.code}: {m.path} (parent={parent_code}, breadcrumb_only={m.breadcrumb_only})")


if __name__ == '__main__':
    add_ocs_lis_detail()
