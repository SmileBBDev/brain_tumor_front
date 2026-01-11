"""
AI 메뉴/권한 Seed 데이터 실행 스크립트
실행: python run_ai_seed.py
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
    """AI Seed SQL 실행"""

    with connection.cursor() as cursor:
        # 1. 기존 메뉴 ID 최대값 확인
        cursor.execute("SELECT MAX(id) FROM menus_menu")
        max_menu_id = cursor.fetchone()[0] or 0
        print(f"현재 메뉴 최대 ID: {max_menu_id}")

        # ID 충돌 방지
        new_ids = [max_menu_id + 1, max_menu_id + 2, max_menu_id + 3]

        # 2. AI_SUMMARY 메뉴 ID 확인
        cursor.execute("SELECT id FROM menus_menu WHERE code = 'AI_SUMMARY'")
        result = cursor.fetchone()
        if not result:
            print("ERROR: AI_SUMMARY 메뉴가 없습니다.")
            return
        ai_summary_id = result[0]
        print(f"AI_SUMMARY 메뉴 ID: {ai_summary_id}")

        # 3. 이미 존재하는지 확인
        cursor.execute("SELECT id FROM menus_menu WHERE code = 'AI_REQUEST_LIST'")
        if cursor.fetchone():
            print("AI_REQUEST_LIST 메뉴가 이미 존재합니다. 스킵.")
            return

        # 4. 메뉴 추가
        print("메뉴 추가 중...")
        cursor.execute("""
            INSERT INTO menus_menu (id, code, path, icon, group_label, breadcrumb_only, `order`, is_active, parent_id)
            VALUES (%s, 'AI_REQUEST_LIST', '/ai/requests', 'list', NULL, 0, 1, 1, %s)
        """, [new_ids[0], ai_summary_id])

        cursor.execute("""
            INSERT INTO menus_menu (id, code, path, icon, group_label, breadcrumb_only, `order`, is_active, parent_id)
            VALUES (%s, 'AI_REQUEST_CREATE', '/ai/requests/create', NULL, NULL, 1, 2, 1, %s)
        """, [new_ids[1], new_ids[0]])

        cursor.execute("""
            INSERT INTO menus_menu (id, code, path, icon, group_label, breadcrumb_only, `order`, is_active, parent_id)
            VALUES (%s, 'AI_REQUEST_DETAIL', '/ai/requests/:id', NULL, NULL, 1, 3, 1, %s)
        """, [new_ids[2], new_ids[0]])

        # 5. 권한 추가
        print("권한 추가 중...")
        cursor.execute("""
            INSERT INTO accounts_permission (code, name, description)
            VALUES ('AI_REQUEST_LIST', 'AI 분석 요청 목록', 'AI 분석 요청 목록 화면')
        """)
        cursor.execute("""
            INSERT INTO accounts_permission (code, name, description)
            VALUES ('AI_REQUEST_CREATE', 'AI 분석 요청 생성', 'AI 분석 요청 생성 화면')
        """)
        cursor.execute("""
            INSERT INTO accounts_permission (code, name, description)
            VALUES ('AI_REQUEST_DETAIL', 'AI 분석 요청 상세', 'AI 분석 요청 상세 화면')
        """)

        # 6. MENU-PERMISSION 매핑
        print("메뉴-권한 매핑 중...")
        cursor.execute("""
            INSERT INTO menus_menupermission (menu_id, permission_id)
            SELECT m.id, p.id FROM menus_menu m
            JOIN accounts_permission p ON m.code = p.code
            WHERE m.code IN ('AI_REQUEST_LIST', 'AI_REQUEST_CREATE', 'AI_REQUEST_DETAIL')
        """)

        # 7. ROLE-PERMISSION 매핑
        print("역할-권한 매핑 중...")
        for perm_code in ['AI_REQUEST_LIST', 'AI_REQUEST_CREATE', 'AI_REQUEST_DETAIL']:
            cursor.execute("""
                INSERT INTO accounts_role_permissions (role_id, permission_id)
                SELECT r.id, p.id FROM accounts_role r
                JOIN accounts_permission p ON p.code = %s
                WHERE r.code IN ('SYSTEMMANAGER', 'ADMIN', 'DOCTOR')
            """, [perm_code])

        # 8. 메뉴 라벨 추가
        print("메뉴 라벨 추가 중...")
        cursor.execute("""
            INSERT INTO menus_menulabel (`role`, `text`, menu_id)
            VALUES ('DEFAULT', 'AI 분석 요청', %s)
        """, [new_ids[0]])
        cursor.execute("""
            INSERT INTO menus_menulabel (`role`, `text`, menu_id)
            VALUES ('DEFAULT', 'AI 분석 요청 생성', %s)
        """, [new_ids[1]])
        cursor.execute("""
            INSERT INTO menus_menulabel (`role`, `text`, menu_id)
            VALUES ('DEFAULT', 'AI 분석 요청 상세', %s)
        """, [new_ids[2]])

        # 9. AI 모델 Seed
        print("AI 모델 추가 중...")
        cursor.execute("SELECT id FROM ai_model WHERE code = 'M1'")
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO ai_model (code, name, description, ocs_sources, required_keys, version, is_active, config, created_at, updated_at)
                VALUES ('M1', 'MRI 4-Channel Analysis', 'MRI 4채널(T1, T2, T1C, FLAIR) 기반 뇌종양 분석',
                        '["RIS"]', '{"RIS": ["dicom.T1", "dicom.T2", "dicom.T1C", "dicom.FLAIR"]}',
                        '1.0.0', 1, '{"timeout_seconds": 300}', NOW(), NOW())
            """)
            cursor.execute("""
                INSERT INTO ai_model (code, name, description, ocs_sources, required_keys, version, is_active, config, created_at, updated_at)
                VALUES ('MG', 'Genetic Analysis', 'RNA 시퀀싱 기반 유전자 분석',
                        '["LIS"]', '{"LIS": ["RNA_seq"]}',
                        '1.0.0', 1, '{"timeout_seconds": 600}', NOW(), NOW())
            """)
            cursor.execute("""
                INSERT INTO ai_model (code, name, description, ocs_sources, required_keys, version, is_active, config, created_at, updated_at)
                VALUES ('MM', 'Multimodal Analysis', 'MRI + 유전 + 단백질 통합 분석',
                        '["RIS", "LIS"]', '{"RIS": ["dicom.T1", "dicom.T2", "dicom.T1C", "dicom.FLAIR"], "LIS": ["RNA_seq", "protein"]}',
                        '1.0.0', 1, '{"timeout_seconds": 900}', NOW(), NOW())
            """)
            print("AI 모델 3개 추가 완료")
        else:
            print("AI 모델이 이미 존재합니다. 스킵.")

        print("\n=== 완료 ===")

        # 검증
        cursor.execute("SELECT code, path FROM menus_menu WHERE code LIKE 'AI_REQUEST%'")
        for row in cursor.fetchall():
            print(f"  메뉴: {row[0]} -> {row[1]}")

        cursor.execute("SELECT code, name FROM ai_model")
        for row in cursor.fetchall():
            print(f"  AI 모델: {row[0]} - {row[1]}")

if __name__ == '__main__':
    run_seed()
