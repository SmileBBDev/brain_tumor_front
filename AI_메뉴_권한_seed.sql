-- =============================================================================
-- AI Inference 메뉴/권한 Seed 데이터
-- 작성일: 2026-01-11
-- 담당: B (Frontend Agent)
-- =============================================================================
-- AI_SUMMARY (id=2) 하위에 AI 추론 관련 메뉴 추가
-- - AI_REQUEST_LIST: AI 분석 요청 목록
-- - AI_REQUEST_CREATE: AI 분석 요청 생성 (breadcrumbOnly)
-- - AI_REQUEST_DETAIL: AI 분석 요청 상세 (breadcrumbOnly)
-- =============================================================================

-- 1. AI 하위 메뉴 추가
-- 기존 AI_SUMMARY (id=2)를 부모로 설정
-- 새 메뉴 ID는 기존 최대값 확인 후 설정 필요 (예: 26, 27, 28)
INSERT INTO menus_menu
(id, code, path, icon, group_label, breadcrumb_only, `order`, is_active, parent_id)
VALUES
(26, 'AI_REQUEST_LIST', '/ai/requests', 'list', NULL, 0, 1, 1, 2),
(27, 'AI_REQUEST_CREATE', '/ai/requests/create', NULL, NULL, 1, 2, 1, 26),
(28, 'AI_REQUEST_DETAIL', '/ai/requests/:id', NULL, NULL, 1, 3, 1, 26);

-- 2. 권한 추가
INSERT INTO accounts_permission (code, name, description)
VALUES
('AI_REQUEST_LIST', 'AI 분석 요청 목록', 'AI 분석 요청 목록 화면'),
('AI_REQUEST_CREATE', 'AI 분석 요청 생성', 'AI 분석 요청 생성 화면'),
('AI_REQUEST_DETAIL', 'AI 분석 요청 상세', 'AI 분석 요청 상세 화면');

-- 3. MENU ↔ PERMISSION 매핑
INSERT IGNORE INTO menus_menupermission (menu_id, permission_id)
SELECT m.id, p.id
FROM menus_menu m
JOIN accounts_permission p ON m.code = p.code
WHERE m.code IN ('AI_REQUEST_LIST', 'AI_REQUEST_CREATE', 'AI_REQUEST_DETAIL');

-- 4. ROLE ↔ PERMISSION 매핑
-- AI 요청 목록: SYSTEMMANAGER, ADMIN, DOCTOR
INSERT IGNORE INTO accounts_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM accounts_role r
JOIN accounts_permission p
WHERE p.code = 'AI_REQUEST_LIST'
  AND r.code IN ('SYSTEMMANAGER', 'ADMIN', 'DOCTOR');

-- AI 요청 생성: SYSTEMMANAGER, ADMIN, DOCTOR
INSERT IGNORE INTO accounts_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM accounts_role r
JOIN accounts_permission p
WHERE p.code = 'AI_REQUEST_CREATE'
  AND r.code IN ('SYSTEMMANAGER', 'ADMIN', 'DOCTOR');

-- AI 요청 상세: SYSTEMMANAGER, ADMIN, DOCTOR
INSERT IGNORE INTO accounts_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM accounts_role r
JOIN accounts_permission p
WHERE p.code = 'AI_REQUEST_DETAIL'
  AND r.code IN ('SYSTEMMANAGER', 'ADMIN', 'DOCTOR');

-- 5. 메뉴 라벨 추가
INSERT INTO brain_tumor.menus_menulabel (`role`,`text`,menu_id) VALUES
('DEFAULT', 'AI 분석 요청', 26),
('DEFAULT', 'AI 분석 요청 생성', 27),
('DEFAULT', 'AI 분석 요청 상세', 28);


-- =============================================================================
-- 검증 쿼리
-- =============================================================================
-- AI 메뉴 확인
SELECT m.id, m.code, m.path, m.parent_id, p.code as permission_code
FROM menus_menu m
LEFT JOIN menus_menupermission mp ON mp.menu_id = m.id
LEFT JOIN accounts_permission p ON p.id = mp.permission_id
WHERE m.code LIKE 'AI%';

-- DOCTOR 역할의 AI 권한 확인
SELECT r.code as role_code, p.code as permission_code
FROM accounts_role_permissions rp
JOIN accounts_role r ON r.id = rp.role_id
JOIN accounts_permission p ON p.id = rp.permission_id
WHERE p.code LIKE 'AI%';


-- =============================================================================
-- AI 모델 Seed 데이터 (app의 기획.md 2.4절 기준)
-- =============================================================================

INSERT INTO ai_model (code, name, description, ocs_sources, required_keys, version, is_active, config, created_at, updated_at)
VALUES
(
    'M1',
    'MRI 4-Channel Analysis',
    'MRI 4채널(T1, T2, T1C, FLAIR) 기반 뇌종양 분석. 종양 세분화 및 위치 분석 수행.',
    '["RIS"]',
    '{"RIS": ["dicom.T1", "dicom.T2", "dicom.T1C", "dicom.FLAIR"]}',
    '1.0.0',
    1,
    '{"timeout_seconds": 300, "batch_size": 1}',
    NOW(),
    NOW()
),
(
    'MG',
    'Genetic Analysis',
    'RNA 시퀀싱 기반 유전자 분석. MGMT 메틸화, IDH 변이 등 유전적 마커 분석.',
    '["LIS"]',
    '{"LIS": ["RNA_seq"]}',
    '1.0.0',
    1,
    '{"timeout_seconds": 600, "batch_size": 1}',
    NOW(),
    NOW()
),
(
    'MM',
    'Multimodal Analysis',
    'MRI + 유전 + 단백질 통합 분석. 종합적인 종양 특성 분석 및 예후 예측.',
    '["RIS", "LIS"]',
    '{"RIS": ["dicom.T1", "dicom.T2", "dicom.T1C", "dicom.FLAIR"], "LIS": ["RNA_seq", "protein"]}',
    '1.0.0',
    1,
    '{"timeout_seconds": 900, "batch_size": 1}',
    NOW(),
    NOW()
);

-- AI 모델 확인
SELECT code, name, ocs_sources, required_keys, is_active FROM ai_model;
