
-- 테이블 설명
-- - menus_menu : 메뉴 구조 (id, path, icon, group_label, breadcrumb_only, order, is_active, parent_id)
-- - menus_menulabel : 메뉴별 라벨 (role, text, menu_id)
-- - menus_menupermission : 메뉴별 권한 (menu_id, permission_id)
-- - accounts_permission : 권한 정의 (code, name, description)
-- - accounts_role : 역할 정의 (code, name, description, created_at)
-- - accounts_role_permissions : 역할별 권한 매핑

-- 1. 메뉴 구조
INSERT INTO brain_tumor.menus_menu (menu_id, path, icon, group_label, breadcrumb_only, `order`, is_active, parent_id) VALUES
  ('DASHBOARD','/dashboard','home',NULL,0,1,1,NULL),
  ('PATIENT',NULL,NULL,'환자',0,2,1,NULL),
  ('PATIENT_LIST','/patients',NULL,NULL,0,1,1,'PATIENT'),
  ('PATIENT_DETAIL','/patients/:id',NULL,NULL,1,1,1,'PATIENT_LIST'),
  ('ORDER',NULL,NULL,'검사 오더',0,3,1,NULL),
  ('ORDER_LIST','/orders/list','clipboard',NULL,0,1,1,'ORDER'),
  ('ORDER_CREATE','/orders/create',NULL,NULL,0,2,1,'ORDER'),
  ('IMAGING',NULL,NULL,'영상',0,4,1,NULL),
  ('IMAGE_VIEWER','/imaging','image',NULL,0,1,1,'IMAGING'),
  ('RIS_WORKLIST','/ris/worklist','x-ray',NULL,0,2,1,'IMAGING'),
  ('AI_SUMMARY','/ai','brain',NULL,0,5,1,NULL),
  ('LAB',NULL,NULL,'검사',0,6,1,NULL),
  ('LAB_RESULT_VIEW','/lab','book',NULL,0,1,1,'LAB'),
  ('LAB_RESULT_UPLOAD','/lab/upload',NULL,NULL,1,2,1,'LAB'),
  ('ADMIN',NULL,'settings',NULL,0,7,1,NULL),
  ('ADMIN_USER','/admin/users',NULL,NULL,0,1,1,'ADMIN'),
  ('ADMIN_ROLE','/admin/roles',NULL,NULL,0,2,1,'ADMIN'),
  ('ADMIN_MENU_PERMISSION','/admin/permissions',NULL,NULL,0,3,1,'ADMIN'),
  ('ADMIN_AUDIT_LOG','/admin/audit',NULL,NULL,0,4,1,'ADMIN'),
  ('ADMIN_SYSTEM_MONITOR','/admin/monitor',NULL,NULL,0,5,1,'ADMIN');

-- 2. 메뉴 라벨
INSERT INTO brain_tumor.menus_menulabel (role, text, menu_id) VALUES
  ('DEFAULT','대시보드','DASHBOARD'),
  ('DOCTOR','의사 대시보드','DASHBOARD'),
  ('NURSE','간호 대시보드','DASHBOARD'),
  ('DEFAULT','환자','PATIENT'),
  ('DEFAULT','환자 목록','PATIENT_LIST'),
  ('DEFAULT','환자 상세','PATIENT_DETAIL'),
  ('DEFAULT','검사 오더','ORDER'),
  ('DOCTOR','검사 오더','ORDER'),
  ('NURSE','검사 현황','ORDER'),
  ('DEFAULT','오더 목록','ORDER_LIST'),
  ('DEFAULT','오더 생성','ORDER_CREATE'),
  ('DEFAULT','영상','IMAGING'),
  ('DEFAULT','영상 조회','IMAGE_VIEWER'),
  ('DEFAULT','판독 Worklist','RIS_WORKLIST'),
  ('DEFAULT','AI 분석 요약','AI_SUMMARY'),
  ('DEFAULT','검사','LAB'),
  ('DEFAULT','검사 결과 조회','LAB_RESULT_VIEW'),
  ('DEFAULT','검사 결과 업로드','LAB_RESULT_UPLOAD'),
  ('DEFAULT','관리자','ADMIN'),
  ('DEFAULT','사용자 관리','ADMIN_USER'),
  ('DEFAULT','역할 권한 관리','ADMIN_ROLE'),
  ('DEFAULT','메뉴 권한 관리','ADMIN_MENU_PERMISSION'),
  ('DEFAULT','접근 감사 로그','ADMIN_AUDIT_LOG'),
  ('DEFAULT','시스템 모니터링','ADMIN_SYSTEM_MONITOR');


-- 3. 권한 정의 : 권한은 메뉴별로 만들어야 함.
INSERT INTO brain_tumor.accounts_permission (code,name,description) VALUES
  ('DASHBOARD_VIEW','대시보드 조회','대시보드 접근 권한'),
  ('PATIENT_LIST_VIEW','환자 목록 조회','환자 목록 화면 접근'),
  ('PATIENT_DETAIL_VIEW','환자 상세 조회','환자 상세 화면 접근'),
  ('ORDER_LIST_VIEW','오더 목록 조회','오더 목록 화면 접근'),
  ('ORDER_CREATE','오더 생성','오더 생성 권한'),
  ('IMAGE_VIEWER','영상 조회','영상 조회 권한'),
  ('RIS_WORKLIST','판독 Worklist','RIS 판독 Worklist 접근'),
  ('AI_SUMMARY_VIEW','AI 분석 요약 조회','AI 분석 요약 화면 접근'),
  ('LAB_RESULT_VIEW','검사 결과 조회','검사 결과 조회 권한'),
  ('LAB_RESULT_UPLOAD','검사 결과 업로드','검사 결과 업로드 권한'),
  ('ADMIN_USER','사용자 관리','사용자 관리 권한'),
  ('ADMIN_ROLE','역할 권한 관리','역할 권한 관리 권한'),
  ('ADMIN_MENU_PERMISSION','메뉴 권한 관리','메뉴 권한 관리 권한'),
  ('ADMIN_AUDIT_LOG','접근 감사 로그','접근 감사 로그 권한'),
  ('ADMIN_SYSTEM_MONITOR','시스템 모니터링','시스템 모니터링 권한');

-- 4. 메뉴권한 매핑
INSERT INTO brain_tumor.menus_menupermission (menu_id, permission_id) VALUES
  ('DASHBOARD',1),
  ('PATIENT_LIST',2),
  ('PATIENT_DETAIL',3),
  ('ORDER_LIST',4),
  ('ORDER_CREATE',5),
  ('IMAGE_VIEWER',6),
  ('RIS_WORKLIST',7),
  ('AI_SUMMARY',8),
  ('LAB_RESULT_VIEW',9),
  ('LAB_RESULT_UPLOAD',10),
  ('ADMIN_USER',11),
  ('ADMIN_ROLE',12),
  ('ADMIN_MENU_PERMISSION',13),
  ('ADMIN_AUDIT_LOG',14),
  ('ADMIN_SYSTEM_MONITOR',15);

-- 역할별 권한 매핑
-- 1. 역할(Role) 정의
-- - SYSTEMMANAGER
-- - ADMIN
-- - DOCTOR
-- - NURSE
-- - PATIENT
-- - RIS
-- - LIS
-- 
-- 2. 권한(permissions) 정의 (앞서 1~15번으로 가정)
-- - DASHBOARD_VIEW
-- - PATIENT_LIST_VIEW
-- - PATIENT_DETAIL_VIEW
-- - ORDER_LIST_VIEW
-- - ORDER_CREATE
-- - IMAGE_VIEWER
-- - RIS_WORKLIST
-- - AI_SUMMARY_VIEW
-- - LAB_RESULT_VIEW
-- - LAB_RESULT_UPLOAD
-- - ADMIN_USER
-- - ADMIN_ROLE
-- - ADMIN_MENU_PERMISSION
-- - ADMIN_AUDIT_LOG
-- - ADMIN_SYSTEM_MONITOR

INSERT INTO brain_tumor.accounts_role (code,name,description,created_at) VALUES
	 ('SYSTEMMANAGER','System Manager','시스템 관리자','2025-12-30 13:13:19'),
	 ('ADMIN','Admin','병원 관리자','2025-12-30 13:13:23'),
	 ('DOCTOR','Doctor','의사','2025-12-30 13:13:25'),
	 ('NURSE','nurse','간호사','2025-12-30 14:28:15'),
	 ('PATIENT','Patient','환자','2025-12-30 14:28:16'),
	 ('RIS','Ris','영상과','2025-12-30 14:28:17'),
	 ('LIS','Lis','검사과','2025-12-30 14:28:19');


-- DOCTOR 권한
INSERT INTO brain_tumor.accounts_role_permissions (role_id, permission_id) VALUES
  (3,1),  -- DASHBOARD_VIEW
  (3,2),  -- PATIENT_LIST_VIEW
  (3,3),  -- PATIENT_DETAIL_VIEW
  (3,4),  -- ORDER_LIST_VIEW
  (3,5),  -- ORDER_CREATE
  (3,6),  -- IMAGE_VIEWER
  (3,8),  -- AI_SUMMARY_VIEW
  (3,9);  -- LAB_RESULT_VIEW

-- NURSE 권한
INSERT INTO brain_tumor.accounts_role_permissions (role_id, permission_id) VALUES
  (4,1),  -- DASHBOARD_VIEW
  (4,2),  -- PATIENT_LIST_VIEW
  (4,3),  -- PATIENT_DETAIL_VIEW
  (4,4),  -- ORDER_LIST_VIEW
  (4,6),  -- IMAGE_VIEWER
  (4,8),  -- AI_SUMMARY_VIEW
  (4,9);  -- LAB_RESULT_VIEW

-- RIS 권한
INSERT INTO brain_tumor.accounts_role_permissions (role_id, permission_id) VALUES
  (6,6),  -- IMAGE_VIEWER
  (6,7);  -- RIS_WORKLIST

-- LIS 권한
INSERT INTO brain_tumor.accounts_role_permissions (role_id, permission_id) VALUES
  (7,9),   -- LAB_RESULT_VIEW
  (7,10);  -- LAB_RESULT_UPLOAD

-- ADMIN 권한
INSERT INTO brain_tumor.accounts_role_permissions (role_id, permission_id) VALUES
  (2,11), -- ADMIN_USER
  (2,12), -- ADMIN_ROLE
  (2,13), -- ADMIN_MENU_PERMISSION
  (2,14), -- ADMIN_AUDIT_LOG
  (2,15); -- ADMIN_SYSTEM_MONITOR

  -- SYSTEMMANAGER 권한
  INSERT INTO brain_tumor.accounts_role_permissions (role_id, permission_id) VALUES
  (1,1),  -- DASHBOARD_VIEW
  (1,2),  -- PATIENT_LIST_VIEW
  (1,3),  -- PATIENT_DETAIL_VIEW
  (1,4),  -- ORDER_LIST_VIEW
  (1,5),  -- ORDER_CREATE
  (1,6),  -- IMAGE_VIEWER
  (1,7),  -- RIS_WORKLIST
  (1,8),  -- AI_SUMMARY_VIEW
  (1,9),  -- LAB_RESULT_VIEW
  (1,10),  -- LAB_RESULT_UPLOAD
  (1,11), -- ADMIN_USER
  (1,12), -- ADMIN_ROLE
  (1,13), -- ADMIN_MENU_PERMISSION
  (1,14), -- ADMIN_AUDIT_LOG
  (1,15); -- ADMIN_SYSTEM_MONITOR

  -- User 로그인 정보 생성
  -- 시스템 관리자 : system / system001
  -- 병원 관리자 : admin / admin001
  -- 의사 : doctor1 / doctor001
  -- 간호사 : nurse1 / nurse001
  -- 환자 : patient1 / patient001
  -- 영상과 : ris1 / ris001
  -- 검사과 : lis1 / lis001
   
  INSERT INTO brain_tumor.accounts_user (
	  id, password, last_login, is_superuser, login_id, name, email,
	  is_active, is_staff, created_at, updated_at, role_id
  ) VALUES
	(1, 'pbkdf2_sha256$870000$FhIeubO7Ea81nku1rU6qYt$pKlMlhJcXI0dAqB3zLH3R/iFhqwmr/Cp/6t8xT6VNpU=', NULL, 1, 'system', '시스템관리자', NULL, 1, 1, '2026-01-01 14:52:40', '2026-01-01 14:52:40', 1),
	(2, 'pbkdf2_sha256$870000$9ONdffp7N7wgOlOpxMpP3v$iem1D1RKNst+bJpiTiRjPtg3cDj3cIrvTipxZd8+Ftg=', NULL, 0, 'admin', '병원관리자', NULL, 1, 1, '2026-01-01 14:53:00', '2026-01-01 14:53:00', 2),
	(3, 'pbkdf2_sha256$870000$j62qRil5EPNBIe06yC8P6P$W54ApTO0/Zfgw/rOlcjHVmuit3BrQDyR8dxZ3r4bys4=', NULL, 0, 'doctor1', '의사', NULL, 1, 0, '2026-01-01 14:53:20', '2026-01-01 14:53:20', 3),
	(4, 'pbkdf2_sha256$870000$qIXg8K5LMM2dE4551UUPRq$DMxjs2XgyGGwMlTzrYsBoV8FTY9mNrytOuYy1F/NZyo=', NULL, 0, 'nurse1', '간호사', NULL, 1, 0, '2026-01-01 14:53:40', '2026-01-01 14:53:40', 4),
	(5, 'pbkdf2_sha256$870000$5zqEf3cvgdkscmLiO6RTEK$IF8ptslq3pULwPU6QyFsG8O6oMEEuTn6gIjbNkKqH2c=', NULL, 0, 'patient1', '환자', NULL, 1, 0, '2026-01-01 14:54:00', '2026-01-01 14:54:00', 5),
	(6, 'pbkdf2_sha256$870000$H2h45Z3BiX6poalRE9YJZP$YlGS1NYIbVl1NEz4tZi4iahBlv18k+qz7EJRU2x/b1k=', NULL, 0, 'ris1', '영상과', NULL, 1, 0, '2026-01-01 14:54:20', '2026-01-01 14:54:20', 6),
	(7, 'pbkdf2_sha256$870000$8Vtyi7AIDO6lGbgdkH5xkQ$GhCgB1NAMQRCF9OKcqChQnDHWpIS4Rejg2NUPfDsfvA=', NULL, 0, 'lis1', '검사과', NULL, 1, 0, '2026-01-01 14:54:40', '2026-01-01 14:54:40', 7);
	  
	  
  
  
  
  pbkdf2_sha256$870000$9ONdffp7N7wgOlOpxMpP3v$iem1D1RKNst+bJpiTiRjPtg3cDj3cIrvTipxZd8+Ftg=
  pbkdf2_sha256$870000$uuv7R91jy2IVWIlQbflh5i$A02U67lO8MK1GYnkzFS0LySGTp5VzDso7TDhcbyHl40=
  
  
  
  