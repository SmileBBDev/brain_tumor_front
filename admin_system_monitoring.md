# 관리자 시스템 모니터링 기능 문서

## 개요

본 문서는 Brain Tumor CDSS 시스템에서 관리자가 시스템 환경, 리소스 사용량, 에러 로그 등을 확인하는 방법을 설명합니다.

---

## 1. 시스템 모니터링 API

### 1.1 SystemMonitorView

- **파일:** `brain_tumor_back/apps/common/views.py` (라인 319-442)
- **엔드포인트:** `GET /api/system/monitor/`
- **권한:** IsAdmin (관리자 전용)

#### 기능
- 서버 건강 상태 확인 (Health Check)
- CPU/메모리/디스크 사용량 모니터링
- 활성 세션 수 조회
- 로그인 통계 (성공/실패/잠금)
- 에러 발생 건수
- 서버 상태 판단 (ok/warning/error)

#### 응답 형식

```json
{
  "server": {
    "status": "ok | warning | error",
    "database": "connected | disconnected"
  },
  "resources": {
    "cpu_percent": 45.2,
    "memory_percent": 68.5,
    "memory_used_gb": 10.5,
    "memory_total_gb": 16.0,
    "disk_percent": 55.0
  },
  "sessions": {
    "active_count": 15
  },
  "logins": {
    "today_total": 120,
    "today_success": 115,
    "today_fail": 5,
    "today_locked": 0
  },
  "errors": {
    "count": 5,
    "login_fail": 5,
    "login_locked": 0
  },
  "acknowledged_alerts": [],
  "timestamp": "2026-01-20T10:30:00Z"
}
```

---

### 1.2 HealthCheckView

- **파일:** `brain_tumor_back/apps/common/views.py` (라인 31-66)
- **엔드포인트:** `GET /health/`
- **권한:** AllowAny (인증 불필요, Docker/Kubernetes 헬스체크용)

#### 응답 형식

```json
{
  "status": "healthy | unhealthy",
  "database": "connected | disconnected",
  "timestamp": "2026-01-20T10:30:00Z"
}
```

---

### 1.3 모니터링 알림 설정

#### MonitorAlertConfigView
- **파일:** `brain_tumor_back/apps/common/views.py` (라인 530-588)
- **엔드포인트:** `GET/PUT /api/system/config/monitor-alerts/`
- **기능:** 모니터링 알림 임계값 설정 조회/수정

#### MonitorAlertAcknowledgeView
- **파일:** `brain_tumor_back/apps/common/views.py` (라인 591-656)
- **엔드포인트:** `POST/DELETE /api/system/monitor/acknowledge/`
- **기능:** 경고 확인/취소 처리

---

## 2. 리소스 모니터링 구현

### 2.1 사용 라이브러리

`psutil` 라이브러리를 사용하여 시스템 리소스를 모니터링합니다.

```python
import psutil
import os
```

### 2.2 CPU 사용률

```python
cpu_percent = psutil.cpu_percent(interval=0.1)
```

### 2.3 메모리 사용량

```python
memory = psutil.virtual_memory()
memory_percent = memory.percent
memory_used_gb = memory.used / (1024**3)
memory_total_gb = memory.total / (1024**3)
```

### 2.4 디스크 사용량

```python
# Windows/Linux 호환성 처리
if os.name == 'nt':  # Windows
    disk = psutil.disk_usage('C:\\')
else:  # Linux/Mac
    disk = psutil.disk_usage('/')

disk_percent = disk.percent
```

---

## 3. 상태 판정 로직

### 3.1 상태 레벨

| 상태 | 조건 |
|------|------|
| `error` | 서버가 unhealthy 상태 |
| `warning` | CPU > 90% 또는 메모리 > 90% 또는 에러 > 10건 |
| `ok` | 정상 상태 |

### 3.2 코드

```python
if server_status == "unhealthy":
    status_level = "error"
elif cpu_percent > 90 or memory_percent > 90 or error_count > 10:
    status_level = "warning"
else:
    status_level = "ok"
```

---

## 4. 기본 알림 설정

시스템에 내장된 기본 알림 설정입니다.

| 알림 ID | 제목 | 임계값 | 조치 사항 |
|---------|------|--------|----------|
| `server_warning` | 서버 상태 주의 | - | 불필요한 프로세스 종료, 서버 리소스 확장 검토, 메모리 누수 점검 |
| `cpu_warning` | CPU 사용률 주의 | 90% | CPU 집약적 작업 확인, 프로세스 모니터링, 서버 스케일업 검토 |
| `memory_warning` | 메모리 사용률 주의 | 90% | 메모리 누수 점검, 캐시 정리, 불필요한 프로세스 종료 |
| `disk_warning` | 디스크 사용률 주의 | 90% | 로그 파일 정리, 불필요한 파일 삭제, 디스크 용량 확장 |
| `error_warning` | 오류 발생 주의 | 10건 | 로그인 실패 원인 분석, 보안 점검, 비정상 접근 시도 확인 |

---

## 5. 감사 로그 시스템

### 5.1 AuditLog 모델

- **파일:** `brain_tumor_back/apps/audit/models.py` (라인 5-31)
- **용도:** 로그인/로그아웃 기록

#### 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `user` | ForeignKey | 사용자 |
| `action` | CharField | LOGIN_SUCCESS, LOGIN_FAIL, LOGIN_LOCKED, LOGOUT |
| `ip_address` | GenericIPAddressField | 클라이언트 IP |
| `user_agent` | TextField | 브라우저 정보 |
| `created_at` | DateTimeField | 생성 일시 |

---

### 5.2 AccessLog 모델

- **파일:** `brain_tumor_back/apps/audit/models.py` (라인 34-96)
- **용도:** API 접근 감사 로그

#### 액션 타입

| 값 | 설명 |
|----|------|
| `VIEW` | 조회 |
| `CREATE` | 생성 |
| `UPDATE` | 수정 |
| `DELETE` | 삭제 |
| `EXPORT` | 내보내기 |
| `PRINT` | 출력 |

#### 결과 타입

| 값 | 설명 |
|----|------|
| `SUCCESS` | 성공 |
| `FAIL` | 실패 |

#### 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `user` | ForeignKey | 사용자 |
| `action` | CharField | 액션 타입 |
| `resource_type` | CharField | 리소스 유형 |
| `resource_id` | CharField | 리소스 ID |
| `result` | CharField | 결과 |
| `fail_reason` | TextField | 실패 사유 |
| `ip_address` | GenericIPAddressField | IP 주소 |
| `user_agent` | TextField | User Agent |
| `request_method` | CharField | HTTP 메서드 |
| `request_path` | CharField | 요청 경로 |
| `request_params` | JSONField | 요청 파라미터 |
| `http_status` | IntegerField | HTTP 상태 코드 |
| `duration_ms` | IntegerField | 처리 시간 (ms) |
| `created_at` | DateTimeField | 생성 일시 |

---

### 5.3 감사 로그 API

| 엔드포인트 | 메서드 | 기능 |
|-----------|--------|------|
| `/api/audit/` | GET | 인증 감사 로그 목록 |
| `/api/audit/access/` | GET | 접근 감사 로그 목록 |
| `/api/audit/access/<id>/` | GET | 접근 감사 로그 상세 |
| `/api/audit/access/summary/` | GET | 접근 감사 로그 요약 |

#### 필터 파라미터

- `login_id` - 사용자 로그인 ID
- `action` - 액션 타입
- `result` - 결과 (SUCCESS/FAIL)
- `start_date`, `end_date` - 날짜 범위
- `ip_address` - IP 주소

---

## 6. 에러 처리 시스템

### 6.1 커스텀 예외 핸들러

- **파일:** `brain_tumor_back/utils/exception_handlers.py`

모든 예외를 캐치하여 로깅하고 표준화된 응답을 반환합니다.

```python
def custom_exception_handler(exc, context):
    # CDSS 커스텀 예외 처리
    # DRF 기본 예외 처리
    # 예상치 못한 예외 (500 에러) 처리
    # 모든 예외가 logger에 기록됨
```

---

### 6.2 AccessLog 미들웨어

- **파일:** `brain_tumor_back/utils/middleware/access_log.py`

모든 API 요청/응답을 자동으로 기록합니다.

#### 기록 정보
- 사용자 정보
- 요청 메서드, 경로, 파라미터
- 응답 상태
- 클라이언트 IP, User Agent
- 처리 시간 (ms)
- 실패 사유

#### 보안 처리
민감한 정보는 자동으로 마스킹됩니다:
- password
- token
- secret
- key

---

## 7. 활성 세션 추적

### 7.1 User 모델 필드

- **파일:** `brain_tumor_back/apps/accounts/models/user.py` (라인 91)

```python
last_seen = models.DateTimeField(null=True, blank=True)
```

### 7.2 활성 세션 계산

최근 30분 이내에 활동한 사용자를 활성 세션으로 간주합니다.

```python
session_threshold = now - timedelta(minutes=30)
active_sessions = User.objects.filter(
    is_active=True,
    last_seen__gte=session_threshold
).count()
```

---

## 8. URL 라우팅

- **파일:** `brain_tumor_back/config/urls.py`

```python
# System Monitor API
path("api/system/monitor/", SystemMonitorView.as_view(), name="system_monitor"),
path("api/system/monitor/acknowledge/", MonitorAlertAcknowledgeView.as_view(), name="monitor_alert_acknowledge"),
path("api/system/config/monitor-alerts/", MonitorAlertConfigView.as_view(), name="monitor_alert_config"),

# Health Check
path("health/", HealthCheckView.as_view(), name="health_check"),

# Dashboard API
path("api/dashboard/admin/stats/", AdminDashboardStatsView.as_view()),

# Audit Logs
path("api/audit/", include("apps.audit.urls")),
```

---

## 9. 관련 모델

### 9.1 SystemConfig

- **파일:** `brain_tumor_back/apps/common/models.py` (라인 5-58)
- **용도:** 시스템 설정 저장 (알림 설정 등)

```python
class SystemConfig(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    description = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
```

### 9.2 MonitorAlertAcknowledge

- **파일:** `brain_tumor_back/apps/common/models.py` (라인 61-85)
- **용도:** 경고 확인 기록

```python
class MonitorAlertAcknowledge(models.Model):
    alert_type = models.CharField(max_length=50)
    target_date = models.DateField()
    acknowledged_at = models.DateTimeField(auto_now_add=True)
    acknowledged_by = models.ForeignKey(User, on_delete=models.CASCADE)
    note = models.TextField(blank=True)

    class Meta:
        unique_together = ['alert_type', 'target_date']
```

---

## 10. 기능 흐름도

```
Admin Dashboard 접속
    │
    ▼
SystemMonitorView 호출 (GET /api/system/monitor/)
    │
    ├─► 1. 서버 상태 확인
    │       └─ DB 연결 상태
    │
    ├─► 2. 리소스 모니터링 (psutil)
    │       ├─ CPU 사용률
    │       ├─ 메모리 사용률/용량
    │       └─ 디스크 사용률
    │
    ├─► 3. 활성 세션 조회
    │       └─ User.last_seen > now - 30min
    │
    ├─► 4. 로그인 통계 (AuditLog)
    │       ├─ 성공 건수
    │       ├─ 실패 건수
    │       └─ 잠금 건수
    │
    ├─► 5. 상태 판정
    │       └─ ok / warning / error
    │
    └─► 6. 확인된 경고 목록
            └─ MonitorAlertAcknowledge
    │
    ▼
JSON 응답 반환
```

---

## 11. 의존성

### requirements.txt

```
psutil>=5.9.0
```

`psutil` 라이브러리가 설치되어 있어야 시스템 리소스 모니터링이 정상 작동합니다.

---

## 12. 참고 파일 목록

| 파일 | 설명 |
|------|------|
| `apps/common/views.py` | 시스템 모니터링 뷰 |
| `apps/common/models.py` | SystemConfig, MonitorAlertAcknowledge 모델 |
| `apps/audit/models.py` | AuditLog, AccessLog 모델 |
| `apps/audit/views.py` | 감사 로그 API 뷰 |
| `apps/accounts/models/user.py` | User 모델 (last_seen 필드) |
| `utils/exception_handlers.py` | 커스텀 예외 핸들러 |
| `utils/middleware/access_log.py` | 접근 로그 미들웨어 |
| `config/urls.py` | URL 라우팅 설정 |

---

*문서 작성일: 2026-01-20*
