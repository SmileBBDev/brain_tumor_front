"""
AI_VIEWER 메뉴 추가 스크립트
실행: python run_ai_viewer_seed.py
"""
import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.db import connection

def run_seed():
    """AI_VIEWER 메뉴 추가"""

    with connection.cursor() as cursor:
        # 1. 이미 존재하는지 확인
        cursor.execute("SELECT id FROM menus_menu WHERE code = 'AI_VIEWER'")
        if cursor.fetchone():
            print("AI_VIEWER 메뉴가 이미 존재합니다. 스킵.")
            return

        # 2. AI 상위 메뉴 ID 확인
        cursor.execute("SELECT id FROM menus_menu WHERE code = 'AI'")
        result = cursor.fetchone()
        if not result:
            print("ERROR: AI 메뉴가 없습니다.")
            return
        ai_menu_id = result[0]
        print(f"AI 메뉴 ID: {ai_menu_id}")

        # 3. 메뉴 ID 최대값 확인
        cursor.execute("SELECT MAX(id) FROM menus_menu")
        max_menu_id = cursor.fetchone()[0] or 0
        new_menu_id = max_menu_id + 1
        print(f"새 메뉴 ID: {new_menu_id}")

        # 4. AI_VIEWER 메뉴 추가
        print("AI_VIEWER 메뉴 추가 중...")
        cursor.execute("""
            INSERT INTO menus_menu (id, code, path, icon, group_label, breadcrumb_only, `order`, is_active, parent_id)
            VALUES (%s, 'AI_VIEWER', '/ai/viewer', 'eye', NULL, 0, 1, 1, %s)
        """, [new_menu_id, ai_menu_id])

        # 5. 기존 AI 하위 메뉴 order 업데이트 (AI_VIEWER가 첫 번째가 되도록)
        print("기존 메뉴 순서 업데이트 중...")
        cursor.execute("""
            UPDATE menus_menu SET `order` = `order` + 1
            WHERE parent_id = %s AND code != 'AI_VIEWER'
        """, [ai_menu_id])

        # 6. Permission 추가
        print("권한 추가 중...")
        cursor.execute("SELECT id FROM accounts_permission WHERE code = 'AI_VIEWER'")
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO accounts_permission (code, name, description)
                VALUES ('AI_VIEWER', 'AI 분석 뷰어', 'AI 분석 뷰어 화면')
            """)

        # 7. MENU-PERMISSION 매핑
        print("메뉴-권한 매핑 중...")
        cursor.execute("""
            INSERT INTO menus_menupermission (menu_id, permission_id)
            SELECT m.id, p.id FROM menus_menu m
            JOIN accounts_permission p ON p.code = 'AI_VIEWER'
            WHERE m.code = 'AI_VIEWER'
            AND NOT EXISTS (
                SELECT 1 FROM menus_menupermission mp
                WHERE mp.menu_id = m.id AND mp.permission_id = p.id
            )
        """)

        # 8. ROLE-PERMISSION 매핑 (SYSTEMMANAGER, ADMIN, DOCTOR, RIS, LIS)
        print("역할-권한 매핑 중...")
        cursor.execute("""
            INSERT INTO accounts_role_permissions (role_id, permission_id)
            SELECT r.id, p.id FROM accounts_role r
            JOIN accounts_permission p ON p.code = 'AI_VIEWER'
            WHERE r.code IN ('SYSTEMMANAGER', 'ADMIN', 'DOCTOR', 'RIS', 'LIS')
            AND NOT EXISTS (
                SELECT 1 FROM accounts_role_permissions rp
                WHERE rp.role_id = r.id AND rp.permission_id = p.id
            )
        """)

        # 9. 메뉴 라벨 추가
        print("메뉴 라벨 추가 중...")
        cursor.execute("""
            INSERT INTO menus_menulabel (`role`, `text`, menu_id)
            VALUES ('DEFAULT', 'AI 분석 뷰어', %s)
        """, [new_menu_id])

        print("\n=== 완료 ===")

        # 검증
        cursor.execute("SELECT code, path, `order` FROM menus_menu WHERE parent_id = %s ORDER BY `order`", [ai_menu_id])
        print("AI 하위 메뉴:")
        for row in cursor.fetchall():
            print(f"  {row[2]}. {row[0]} -> {row[1]}")

if __name__ == '__main__':
    run_seed()
