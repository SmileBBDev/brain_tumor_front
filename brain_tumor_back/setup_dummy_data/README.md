# Setup Dummy Data - 더미 데이터 생성 시스템

Brain Tumor CDSS 프로젝트의 개발/테스트용 더미 데이터 생성 시스템입니다.

## 목차

1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [설계 철학](#설계-철학)
4. [사용법](#사용법)
5. [파일 구조](#파일-구조)
6. [데이터 흐름](#데이터-흐름)
7. [새 기능 추가 가이드](#새-기능-추가-가이드)
8. [테스트 계정](#테스트-계정)

---

## 개요

이 시스템은 개발 및 테스트 환경에서 필요한 더미 데이터를 자동으로 생성합니다.

### 주요 기능

- **자동 DB 생성**: MySQL 데이터베이스가 없으면 자동 생성
- **자동 마이그레이션**: `makemigrations` + `migrate` 자동 실행
- **멱등성 보장**: 여러 번 실행해도 동일한 결과
- **계층적 데이터 생성**: 의존성 순서대로 데이터 생성
- **유연한 옵션**: 부분 실행, 초기화, 강제 추가 등 지원

---

## 아키텍처

```
setup_dummy_data/
├── main.py                              # 통합 실행 래퍼 (진입점)
├── __main__.py                          # python -m setup_dummy_data 지원
├── __init__.py                          # 패키지 초기화
├── setup_dummy_data_1_base.py           # 기본 데이터 (역할, 사용자, 메뉴/권한)
├── setup_dummy_data_2_clinical.py       # 임상 데이터 (환자, 진료, OCS, AI, 치료, 경과, 처방)
├── setup_dummy_data_3_extended.py       # 확장 데이터 (대량 진료/OCS, 오늘 진료, 일정)
├── DB_SETUP_GUIDE.md                    # DB 설정 가이드
└── README.md                            # 이 문서
```

### 계층 구조

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           main.py (통합 래퍼)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│    1_base.py        │    2_clinical.py       │    3_extended.py             │
│    (기본)            │    (임상)               │    (확장)                    │
├─────────────────────┼────────────────────────┼──────────────────────────────┤
│  - DB 생성           │ - 환자 50명             │ - 확장 진료 150건            │
│  - 마이그레이션       │ - 진료 20건             │ - 확장 OCS RIS 100건         │
│  - 역할 7개          │ - OCS (RIS 30건)        │ - 확장 OCS LIS 80건          │
│  - 사용자 10명       │ - OCS (LIS 20건)        │ - 오늘 예약 진료             │
│  - 메뉴/권한         │ - AI 모델 3개           │ - 공유 일정                  │
│                     │ - 치료 계획 15건         │ - 개인 일정                  │
│                     │ - 경과 추적 25건         │                              │
│                     │ - AI 요청 10건           │                              │
│                     │ - 처방 20건              │                              │
└─────────────────────┴────────────────────────┴──────────────────────────────┘
```

---

## 설계 철학

### 1. 멱등성 (Idempotency)

여러 번 실행해도 동일한 결과를 보장합니다.

```python
# 이미 존재하면 SKIP, 없으면 CREATE
if User.objects.filter(login_id=login_id).exists():
    print(f"  [SKIP] {login_id} 이미 존재")
else:
    User.objects.create_user(...)
    print(f"  [CREATE] {login_id}")
```

### 2. 계층적 의존성 (Layered Dependencies)

```
1_base (기본) ──► 2_clinical (임상) ──► 3_extended (확장)
     │                   │                    │
     ▼                   ▼                    ▼
  역할/사용자           환자                 대량 진료
  메뉴/권한            진료/OCS              오늘 진료
                      AI모델                 일정
                      치료/경과
                      처방
```

각 스크립트는 이전 단계의 데이터에 의존합니다.

### 3. 데이터 일관성

- **환자 데이터**: `setup_dummy_data_2_clinical.py`에서 통합 관리 (50명)
- **OCS 데이터**: 담당 의사-환자 관계(진료 기록)에 기반하여 생성
- **동명이인 금지**: 모든 사용자/환자 이름은 고유

### 4. 목표 수량 기반 생성

```python
def create_dummy_patients(target_count=50, force=False):
    existing = Patient.objects.filter(is_deleted=False).count()

    # 이미 목표 수량 이상이면 SKIP
    if existing >= target_count and not force:
        print(f"[SKIP] 이미 {existing}명 존재")
        return

    # 부족분만 생성
    to_create = target_count - existing
```

### 5. 트랜잭션 안전성

```python
from django.db import transaction

@transaction.atomic
def create_complex_data():
    # 모든 작업이 성공하거나 모두 롤백
    ...
```

---

## 사용법

### 기본 실행

```bash
# 프로젝트 루트에서 실행
cd brain_tumor_back

# 전체 데이터 생성 (기존 데이터 유지, 부족분만 추가)
python -m setup_dummy_data

# 또는
python setup_dummy_data/main.py
```

### 옵션

| 옵션 | 설명 |
|------|------|
| `--reset` | 기존 데이터 삭제 후 새로 생성 |
| `--force` | 목표 수량 이상이어도 강제 추가 |
| `--base` | 기본 데이터만 생성 (1_base) |
| `--clinical` | 임상 데이터만 생성 (2_clinical) |
| `--extended` | 확장 데이터만 생성 (3_extended) |
| `--menu` | 메뉴/권한만 업데이트 |
| `-y, --yes` | 확인 없이 자동 실행 |

### 사용 예시

```bash
# 전체 초기화 후 재생성
python -m setup_dummy_data --reset

# 확인 없이 자동 초기화
python -m setup_dummy_data --reset -y

# 메뉴/권한만 업데이트 (네비게이션 반영)
python -m setup_dummy_data --menu

# 기본 데이터만 강제 추가
python -m setup_dummy_data --base --force

# 임상 데이터만 생성
python -m setup_dummy_data --clinical

# 확장 데이터만 생성
python -m setup_dummy_data --extended
```

### 개별 스크립트 실행

```bash
# 기본 데이터만 (역할, 사용자, 메뉴/권한)
python setup_dummy_data/setup_dummy_data_1_base.py [--reset] [--force]

# 임상 데이터만 (환자, 진료, OCS, AI, 치료, 경과, 처방)
python setup_dummy_data/setup_dummy_data_2_clinical.py [--reset] [--force]

# 확장 데이터만 (대량 진료/OCS, 오늘 진료, 일정)
python setup_dummy_data/setup_dummy_data_3_extended.py [--reset] [--force]
```

---

## 파일 구조

### main.py - 통합 실행 래퍼

```python
def main():
    # 1. 기본 데이터 (역할, 사용자, 메뉴/권한)
    run_script('setup_dummy_data_1_base.py', args)

    # 2. 임상 데이터 (환자, 진료, OCS, AI, 치료, 경과, 처방)
    run_script('setup_dummy_data_2_clinical.py', args)

    # 3. 확장 데이터 (대량 진료/OCS, 오늘 진료, 일정)
    run_script('setup_dummy_data_3_extended.py', args)

    # 4. 추가 사용자 (admin2, nurse2...)
    create_additional_users()

    # 5. 환자 계정 연결
    link_patient_accounts()

    # 6. 최종 요약
    print_final_summary()
```

### setup_dummy_data_1_base.py - 기본 데이터

```python
# ========== 0단계: 인프라 ==========
create_database_if_not_exists()  # DB 자동 생성
run_migrations()                  # makemigrations + migrate

# ========== 1단계: 기본 설정 ==========
setup_roles()           # 역할 7개 정의
setup_superuser()       # 시스템 관리자
setup_test_users()      # 테스트 사용자 10명

# ========== 2단계: 메뉴/권한 ==========
setup_menus_and_permissions()
```

### setup_dummy_data_2_clinical.py - 임상 데이터

```python
# ========== 선행 조건 확인 ==========
check_prerequisites()  # 사용자, 의사 존재 확인

# ========== 환자/진료/OCS ==========
create_dummy_patients()           # 환자 50명
create_dummy_encounters()         # 진료 20건
create_dummy_imaging_with_ocs()   # OCS RIS 30건 + ImagingStudy
create_dummy_lis_orders()         # OCS LIS 20건
create_ai_models()                # AI 모델 3개

# ========== 치료/경과/AI ==========
create_dummy_treatment_plans()    # 치료 계획 15건
create_dummy_followups()          # 경과 추적 25건
create_dummy_ai_requests()        # AI 요청 10건

# ========== 처방 ==========
create_dummy_prescriptions()      # 처방 20건 + 항목 ~60건
```

### setup_dummy_data_3_extended.py - 확장 데이터

```python
# ========== 선행 조건 확인 ==========
check_prerequisites()  # 사용자, 환자 존재 확인

# ========== 대량 데이터 ==========
create_extended_encounters()  # 확장 진료 150건
create_extended_ocs_ris()     # 확장 OCS RIS 100건
create_extended_ocs_lis()     # 확장 OCS LIS 80건

# ========== 오늘 진료 ==========
create_today_encounters()     # 오늘 예약 환자

# ========== 일정 ==========
create_shared_schedules()     # 공유 일정
create_personal_schedules()   # 개인 일정
```

---

## 데이터 흐름

### 실행 순서

```
python -m setup_dummy_data
         │
         ▼
    ┌─────────┐
    │ main.py │
    └────┬────┘
         │
    ┌────▼────────────────────────────────────┐
    │ 1_base.py                               │
    │  ├─► DB 생성 (없으면)                    │
    │  ├─► 마이그레이션                        │
    │  ├─► 역할 7개                            │
    │  ├─► 사용자 10명                         │
    │  └─► 메뉴/권한                           │
    └────┬────────────────────────────────────┘
         │
    ┌────▼────────────────────────────────────┐
    │ 2_clinical.py                           │
    │  ├─► 환자 50명                           │
    │  ├─► 진료 20건                           │
    │  ├─► OCS RIS 30건 + ImagingStudy        │
    │  ├─► OCS LIS 20건                        │
    │  ├─► AI 모델 3개                         │
    │  ├─► 치료 계획 15건                      │
    │  ├─► 경과 추적 25건                      │
    │  ├─► AI 요청 10건                        │
    │  └─► 처방 20건 + 항목 ~60건              │
    └────┬────────────────────────────────────┘
         │
    ┌────▼────────────────────────────────────┐
    │ 3_extended.py                           │
    │  ├─► 확장 진료 150건                     │
    │  ├─► 확장 OCS RIS 100건                  │
    │  ├─► 확장 OCS LIS 80건                   │
    │  ├─► 오늘 예약 진료                      │
    │  ├─► 공유 일정                           │
    │  └─► 개인 일정                           │
    └────┬────────────────────────────────────┘
         │
    ┌────▼────────────────────────────────────┐
    │ main.py (추가 작업)                      │
    │  ├─► 추가 사용자 생성                    │
    │  └─► 환자 계정 연결                      │
    └────┬────────────────────────────────────┘
         │
         ▼
    최종 요약 출력
```

---

## 새 기능 추가 가이드

### 새 권한 추가

`setup_dummy_data_1_base.py`의 `permissions_data` 수정:

```python
permissions_data = [
    # 기존 권한들...
    ('NEW_FEATURE', '새 기능', '새 기능 설명'),
    ('NEW_FEATURE_LIST', '새 기능 목록', '새 기능 목록 화면'),
]
```

### 새 메뉴 추가

`setup_dummy_data_1_base.py`의 `setup_menus_and_permissions()` 수정:

```python
# 메뉴 생성 (ID는 기존 최대값 + 1)
menu_new, _ = create_menu(
    42,                          # ID
    code='NEW_FEATURE',          # 코드
    path=None,                   # 상위 메뉴는 path 없음
    icon='star',                 # 아이콘
    group_label='새기능',         # 그룹 라벨
    order=9,                     # 정렬 순서
    is_active=True
)
```

### 역할별 권한 매핑

```python
role_menu_permissions = {
    'SYSTEMMANAGER': list(menu_map.keys()),  # 모든 메뉴
    'ADMIN': [
        # 기존 권한들...
        'NEW_FEATURE', 'NEW_FEATURE_LIST',
    ],
    'DOCTOR': [
        # 기존 권한들...
        'NEW_FEATURE_LIST',  # 필요시 추가
    ],
}
```

---

## 테스트 계정

### 비밀번호 규칙

> **규칙: `{login_id}001`**
>
> 예시: `admin` → `admin001`, `doctor1` → `doctor1001`

### 기본 계정

| 역할 | 로그인 ID | 비밀번호 | 설명 |
|------|----------|----------|------|
| SYSTEMMANAGER | system | system001 | 시스템 관리자 (전체 권한) |
| ADMIN | admin | admin001 | 병원 관리자 |
| DOCTOR | doctor1~5 | doctor1001~doctor5001 | 의사 5명 |
| NURSE | nurse1 | nurse1001 | 간호사 |
| PATIENT | patient1 | patient1001 | 환자 |
| RIS | ris1 | ris1001 | 영상과 |
| LIS | lis1 | lis1001 | 검사과 |

### 추가 계정 (main.py에서 생성)

| 역할 | 로그인 ID | 비밀번호 |
|------|----------|----------|
| ADMIN | admin2, admin3 | admin2001, admin3001 |
| NURSE | nurse2, nurse3 | nurse2001, nurse3001 |
| RIS | ris2, ris3 | ris2001, ris3001 |
| LIS | lis2, lis3 | lis2001, lis3001 |
| PATIENT | patient2, patient3 | patient2001, patient3001 |

### 환자 계정 연결

| 계정 | 환자번호 | 환자명 |
|------|----------|--------|
| patient1 | P202600001 | 김동현 |
| patient2 | P202600002 | 이수정 |
| patient3 | P202600003 | 박정훈 |

---

## 트러블슈팅

### 마이그레이션 실패 시

```bash
# 수동으로 마이그레이션 실행
python manage.py makemigrations --skip-checks
python manage.py migrate --skip-checks
```

### 메뉴가 네비게이션에 안 보일 때

```bash
# 메뉴/권한만 업데이트
python -m setup_dummy_data --menu
```

### 데이터 완전 초기화

```bash
# 모든 더미 데이터 삭제 후 재생성
python -m setup_dummy_data --reset -y
```

---

## 관련 문서

- [DB_SETUP_GUIDE.md](./DB_SETUP_GUIDE.md) - 데이터베이스 설정 가이드
- [프로젝트 README](../README.md) - 프로젝트 전체 문서
