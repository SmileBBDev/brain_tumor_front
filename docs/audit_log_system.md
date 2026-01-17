# 감사 로그 시스템 (Audit Log System)

## 개요

Brain Tumor CDSS의 감사 로그 시스템은 두 가지 유형의 로그를 관리합니다:

1. **인증 로그 (AuditLog)**: 로그인/로그아웃 이력
2. **접근 로그 (AccessLog)**: 시스템 행위 추적

---

## 1. 인증 로그 (AuditLog)

### 1.1 목적
- 사용자 로그인/로그아웃 이력 추적
- 로그인 실패 및 계정 잠금 모니터링
- 보안 감사 및 침입 탐지

### 1.2 데이터 모델

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | BigAutoField | PK |
| `user` | ForeignKey | 사용자 (nullable) |
| `action` | CharField | 액션 유형 |
| `ip_address` | GenericIPAddressField | 접속 IP |
| `user_agent` | TextField | 브라우저 정보 |
| `created_at` | DateTimeField | 발생 시간 |

### 1.3 액션 유형

| 액션 코드 | 설명 | 발생 조건 |
|-----------|------|-----------|
| `LOGIN_SUCCESS` | 로그인 성공 | ID/PW 모두 일치 |
| `LOGIN_FAIL` | 로그인 실패 | ID 또는 PW 불일치 |
| `LOGIN_LOCKED` | 계정 잠금 | 5회 연속 실패 |
| `LOGOUT` | 로그아웃 | 사용자 로그아웃 |

### 1.4 인증 판단 로직

```
사용자 로그인 시도
       │
       ▼
 authenticate(id, pw)
       │
       ├── user=None (실패)
       │      │
       │      ├── ID 존재 → 해당 사용자로 LOGIN_FAIL 기록
       │      │              + failed_login_count 증가
       │      │              + 5회 초과 시 LOGIN_LOCKED
       │      │
       │      └── ID 없음 → user=null로 LOGIN_FAIL 기록
       │
       └── user=User객체 (ID/PW 일치)
              │
              ├── is_locked=True → LOGIN_LOCKED 에러
              ├── is_active=False → INACTIVE_USER 에러
              └── 정상 → LOGIN_SUCCESS 기록
```

### 1.5 로그 기록 위치

- **성공**: `apps/authorization/views.py` → `LoginView.post()`
- **실패**: `apps/authorization/serializers.py` → `LoginSerializer.validate()`
- **서비스 함수**: `apps/audit/services.py` → `create_audit_log()`

```python
# apps/audit/services.py
def create_audit_log(request, action, user=None):
    AuditLog.objects.create(
        user=user,
        action=action,
        ip_address=request.META.get("REMOTE_ADDR"),
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
    )
```

---

## 2. 접근 로그 (AccessLog)

### 2.1 목적
- API 호출 이력 추적
- 사용자 행위 감사
- 시스템 사용 통계

### 2.2 데이터 모델

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | BigAutoField | PK |
| `user` | ForeignKey | 사용자 |
| `user_role` | CharField | 사용자 역할 (스냅샷) |
| `request_method` | CharField | HTTP 메서드 |
| `request_path` | CharField | 요청 경로 |
| `request_params` | JSONField | 요청 파라미터 |
| `menu_name` | CharField | 메뉴명 |
| `action` | CharField | 액션 유형 |
| `ip_address` | GenericIPAddressField | 접속 IP |
| `user_agent` | TextField | 브라우저 정보 |
| `result` | CharField | 결과 (SUCCESS/FAIL) |
| `fail_reason` | TextField | 실패 사유 |
| `response_status` | IntegerField | HTTP 상태 코드 |
| `duration_ms` | IntegerField | 처리 시간 (ms) |
| `created_at` | DateTimeField | 발생 시간 |

### 2.3 액션 유형

| 액션 코드 | 설명 | HTTP 메서드 |
|-----------|------|-------------|
| `VIEW` | 조회 | GET |
| `CREATE` | 생성 | POST |
| `UPDATE` | 수정 | PUT, PATCH |
| `DELETE` | 삭제 | DELETE |
| `EXPORT` | 내보내기 | GET (export 경로) |
| `PRINT` | 인쇄 | GET (print 경로) |

### 2.4 로그 기록 (미들웨어)

`utils/middleware/access_log.py`에서 자동 기록:

```python
# HTTP 메서드 → 액션 매핑
METHOD_ACTION_MAP = {
    'GET': 'VIEW',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE',
}
```

---

## 3. API 엔드포인트

### 3.1 인증 로그

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/audit/` | 인증 로그 목록 |

**필터 파라미터:**
- `user_login_id`: 사용자 ID (부분 일치)
- `action`: 액션 유형
- `date`: 특정 날짜
- `date_from`, `date_to`: 기간 필터
- `page`, `page_size`: 페이지네이션

### 3.2 접근 로그

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/audit/access/` | 접근 로그 목록 |
| GET | `/api/audit/access/{id}/` | 접근 로그 상세 |
| GET | `/api/audit/access/summary/` | 요약 정보 |

**필터 파라미터:**
- `user_login_id`: 사용자 ID
- `user_role`: 역할
- `action`: 액션 유형
- `result`: 결과 (SUCCESS/FAIL)
- `ip_address`: IP 주소
- `date_from`, `date_to`: 기간 필터

---

## 4. 프론트엔드 페이지

### 4.1 접근 경로
`/admin/audit`

### 4.2 탭 구성

```
┌──────────────┬──────────────┐
│  인증 로그   │  접근 로그   │
├──────────────┴──────────────┤
│  필터 영역                   │
├─────────────────────────────┤
│  테이블                      │
├─────────────────────────────┤
│  페이지네이션                │
└─────────────────────────────┘
```

### 4.3 인증 로그 테이블

| 시간 | 사용자 | 이름 | 역할 | 액션 | IP 주소 | 결과 |

### 4.4 접근 로그 테이블

| 시간 | 사용자 | 역할 | 메뉴 | 액션 | 경로 | IP 주소 | 결과 |

---

## 5. 관련 파일

### 백엔드
- `apps/audit/models.py` - 모델 정의
- `apps/audit/views.py` - API 뷰
- `apps/audit/serializers.py` - 시리얼라이저
- `apps/audit/urls.py` - URL 라우팅
- `apps/audit/services.py` - 유틸 함수
- `utils/middleware/access_log.py` - 접근 로그 미들웨어

### 프론트엔드
- `src/pages/admin/AuditLog.tsx` - 감사 로그 페이지
- `src/services/audit.api.ts` - API 호출
- `src/assets/style/adminPageStyle.css` - 스타일

---

## 6. 보안 고려사항

1. **인증 로그는 항상 기록**: 실패 시에도 기록하여 공격 탐지
2. **IP 주소 저장**: 접속 위치 추적 가능
3. **User Agent 저장**: 디바이스/브라우저 식별
4. **역할 스냅샷**: 접근 시점의 역할 저장 (이후 변경되어도 추적 가능)
5. **실패 사유 기록**: 접근 거부 원인 분석

---

## 7. 더미 데이터

개발/테스트용 더미 데이터 생성:

```bash
# 전체 더미 데이터 (AuditLog + AccessLog 포함)
python -m setup_dummy_data

# AccessLog만 생성
python setup_dummy_data/setup_dummy_data_5_access_logs.py

# 기존 데이터 삭제 후 새로 생성
python setup_dummy_data/setup_dummy_data_5_access_logs.py --reset
```
