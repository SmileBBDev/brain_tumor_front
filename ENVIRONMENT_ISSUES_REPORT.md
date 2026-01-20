# Brain Tumor CDSS - 의존성/설정/환경 문제 보고서

**작성일**: 2026-01-20
**프로젝트**: NeuroNova CDSS (Brain Tumor Clinical Decision Support System)

---

## 목차

1. [의존성 문제](#1-의존성-문제)
2. [설정 파일 문제](#2-설정-파일-문제)
3. [환경 변수 문제](#3-환경-변수-문제)
4. [Docker/배포 환경 문제](#4-docker배포-환경-문제)
5. [서비스 간 통신 문제](#5-서비스-간-통신-문제)
6. [권장 조치 요약](#6-권장-조치-요약)

---

## 1. 의존성 문제

### 1.1 requirements.txt 인코딩 오류 (Critical)

| 상태 | 파일 | 영향도 |
|------|------|--------|
| 🔴 치명적 | `brain_tumor_back/requirements.txt` | 패키지 설치 완전 실패 |

**현상**: 파일이 UTF-16 인코딩으로 저장되어 패키지명 사이에 공백 문자 삽입

```
# 현재 상태 (잘못됨)
a n y i o = = 4 . 1 2 . 1
D j a n g o = = 5 . 2 . 1 0

# 정상 상태
anyio==4.12.1
Django==5.2.10
```

**영향**:
- `pip install -r requirements.txt` 실행 시 모든 패키지 인식 실패
- Docker 빌드 실패

**해결 방법**:
```bash
cd brain_tumor_back
pip freeze > requirements.txt  # UTF-8로 재생성
```

---

### 1.2 NumPy 버전 충돌

| 컴포넌트 | 버전 | 파일 |
|----------|------|------|
| Backend (Django) | 2.4.1 | `brain_tumor_back/requirements.txt` |
| AI Server (FastAPI) | 1.26.4 | `modAI/requirements.txt` |

**문제점**:
```python
# modAI/requirements.txt 주석
# ============================================================
# Scientific Computing (⚠️ NumPy 2.x 금지)
# ============================================================
numpy==1.26.4
```

- modAI는 MONAI/PyTorch 호환성을 위해 NumPy 2.x 사용 금지
- Django 백엔드는 NumPy 2.4.1 사용 중
- 두 서비스 간 데이터 교환 시 직렬화/역직렬화 호환성 문제 가능

**권장 조치**: Django 백엔드도 `numpy==1.26.4` 사용

---

### 1.3 Python 버전 불일치

| 환경 | Python 버전 |
|------|-------------|
| Dockerfile (Django) | 3.11 |
| Dockerfile (FastAPI) | 3.11 |
| 로컬 개발 (pycache) | 3.13 |

**증거**: `__pycache__` 폴더에 `cpython-313.pyc` 파일 존재

```
brain_tumor_back\config\__pycache__\__init__.cpython-313.pyc
brain_tumor_back\apps\accounts\__pycache__\apps.cpython-313.pyc
```

**영향**:
- 로컬(3.13)과 Docker(3.11) 환경 간 바이트코드 호환성 문제
- 일부 Python 3.13 전용 기능 사용 시 Docker에서 오류 발생 가능

**권장 조치**:
- 로컬 개발 환경을 Python 3.11로 통일
- 또는 Dockerfile을 Python 3.13으로 업그레이드

---

### 1.4 Frontend 패키지 버전

| 패키지 | 버전 | 비고 |
|--------|------|------|
| React | 19.2.0 | 최신 버전 (React 19) |
| TypeScript | 5.9.3 | 최신 버전 |
| Vite | 7.2.4 | 최신 버전 |
| MUI | 7.3.6 | Material UI v7 |

**잠재적 문제**:
- React 19는 2024년 12월 출시된 최신 버전으로, 일부 라이브러리와 호환성 이슈 가능
- `cornerstone-tools@6.0.10`은 React 18 기준으로 개발됨

---

## 2. 설정 파일 문제

### 2.1 Django settings.py DEBUG 중복 정의

| 라인 | 코드 | 결과 |
|------|------|------|
| 20 | `DEBUG = env.bool('DEBUG', default=False)` | .env에서 로드 |
| 26 | `DEBUG = env.bool("DEBUG", default=True)` | **항상 True로 덮어씀** |

```python
# brain_tumor_back/config/settings.py

SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)  # 라인 20

# 추후 실제 배포시 (수정필요)
DEBUG = env.bool("DEBUG", default=True)   # 라인 26 - 문제!
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])
```

**영향**: `.env`에서 `DEBUG=False`로 설정해도 항상 True로 동작

**해결 방법**: 라인 26 제거 또는 주석 처리

---

### 2.2 base.py vs settings.py 설정 충돌

| 설정 항목 | base.py | settings.py |
|-----------|---------|-------------|
| 데이터베이스 | SQLite | MySQL |
| AUTH_PASSWORD_VALIDATORS | `[]` (비어있음) | 4개 validator |
| INSTALLED_APPS | 7개 앱 | 17개 앱 |
| CORS | `CORS_ALLOW_ALL_ORIGINS = True` | 특정 origins만 허용 |

**구조 분석**:
```python
# settings.py 상단
from .base import *  # base.py 전체 import

# 이후 settings.py에서 덮어씀
```

**잠재적 문제**:
- `from .base import *`로 인해 base.py의 설정이 먼저 적용됨
- settings.py에서 명시적으로 재정의하지 않은 설정은 base.py 값 사용
- 예: base.py의 `CORS_ALLOW_ALL_ORIGINS = True`가 적용될 수 있음

---

### 2.3 ASGI 설정의 print 문

```python
# brain_tumor_back/config/asgi.py:21
print("ASGI LOADED")
```

**영향**: 프로덕션 환경에서 불필요한 stdout 출력

---

### 2.4 tsconfig.json 구조 문제

```json
// brain_tumor_front/tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**문제점**:
- `files: []`와 `references`를 함께 사용하는 프로젝트 참조 구조
- `compilerOptions`의 `paths`는 참조된 tsconfig 파일에서 상속되지 않을 수 있음
- `tsconfig.app.json`에도 동일한 paths 설정이 필요할 수 있음

---

## 3. 환경 변수 문제

### 3.1 .env 파일 불일치

| 환경변수 | brain_tumor_back/.env | docker/.env | modAI/.env |
|----------|----------------------|-------------|------------|
| DEBUG | `True` | `DJANGO_DEBUG=True` | `false` |
| REDIS_URL | 미정의 | 미정의 | `redis://localhost:6379/0` |
| FASTAPI_URL | `http://localhost:9000` | `http://192.168.0.46:9000` | 미정의 |
| MAIN_VM_IP | 미정의 | `192.168.0.11` | `localhost` |

**문제점**: 세 개의 .env 파일이 서로 다른 값을 가짐

---

### 3.2 HAPI FHIR 서비스 누락

```yaml
# docker-compose.unified.yml에서 참조
django:
  environment:
    - HAPI_FHIR_URL=http://hapi-fhir:8080

fastapi:
  environment:
    - HAPI_FHIR_URL=http://hapi-fhir:8080
```

**문제점**:
- `hapi-fhir` 서비스가 docker-compose.unified.yml에 정의되어 있지 않음
- `docker/.env`에 HAPI FHIR 관련 변수 존재하지만 서비스 미구현

```
# docker/.env에 정의된 HAPI FHIR 설정
HAPI_FHIR_VERSION=v6.8.3
HAPI_DB_USER=hapifhir
HAPI_DB_PASS=hapi_password
HAPI_DB_NAME=hapifhir
```

---

### 3.3 manage.py 설정 모듈 경로 오류

```python
# brain_tumor_back/manage.py:10
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
```

**문제점**:
- 실제 파일 경로: `config/settings.py`
- 주석 처리된 경로: `config.settings.dev`
- `config/dev.py`는 `from .base import *`만 포함

---

## 4. Docker/배포 환경 문제

### 4.1 Docker Compose 서비스 의존성

```yaml
# docker-compose.unified.yml
nginx:
  depends_on:
    django:
      condition: service_healthy
    fastapi:
      condition: service_healthy
```

**잠재적 문제**:
- Django health check가 `/health/` 엔드포인트에 의존
- FastAPI health check가 `/health` 엔드포인트에 의존
- 서비스 시작 시간이 길면 타임아웃 발생 가능 (`start_period: 60s`)

---

### 4.2 볼륨 마운트 경로 문제

```yaml
# docker-compose.unified.yml
django:
  volumes:
    - ../brain_tumor_back:/app
    - ../CDSS_STORAGE:/CDSS_STORAGE
    - ../patient_data:/patient_data
```

**문제점**:
- `../CDSS_STORAGE`와 `../patient_data` 디렉토리가 존재해야 함
- 디렉토리 미존재 시 Docker가 자동 생성하지만 권한 문제 발생 가능

---

### 4.3 Celery Worker 이미지 의존성

```yaml
fastapi-celery:
  image: nn-fastapi:latest  # fastapi 서비스가 먼저 빌드되어야 함
  depends_on:
    fastapi:
      condition: service_started  # service_healthy가 아님
```

**문제점**:
- `service_started`는 컨테이너 시작만 확인, 애플리케이션 준비 상태 미확인
- FastAPI가 완전히 시작되기 전에 Celery Worker가 시작될 수 있음

---

### 4.4 GPU 리소스 예약

```yaml
fastapi:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]

fastapi-celery:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

**문제점**:
- FastAPI와 Celery Worker가 각각 GPU 1개씩 예약
- 단일 GPU 시스템에서는 리소스 충돌 가능

---

## 5. 서비스 간 통신 문제

### 5.1 URL 설정 혼란

| 서비스 | 로컬 개발 | Docker 내부 | Docker 외부 |
|--------|----------|-------------|-------------|
| Django | `localhost:8000` | `django:8000` | `192.168.0.11:8000` |
| FastAPI | `localhost:9000` | `fastapi:9000` | `192.168.0.46:9000` |
| Redis | `localhost:6379` | `redis:6379` | `192.168.0.11:6379` |
| Orthanc | `localhost:8042` | `orthanc:8042` | `192.168.0.11:8042` |

**문제점**:
- 세 가지 환경(로컬, Docker 내부, Docker 외부)에서 URL이 모두 다름
- `.env` 파일 설정 실수 시 서비스 간 통신 실패

---

### 5.2 Vite 프록시 설정

```typescript
// brain_tumor_front/vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',  // 하드코딩
      changeOrigin: true,
      timeout: 60000,
    },
    '/ws': {
      target: 'ws://localhost:8000',    // 하드코딩
      ws: true,
    },
  },
},
```

**문제점**:
- 프록시 대상이 `localhost:8000`으로 하드코딩
- Docker 환경이나 다른 호스트에서 개발 시 수정 필요
- 환경변수로 설정 가능하도록 변경 권장

---

### 5.3 CORS 설정

```python
# brain_tumor_back/config/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
```

```python
# modAI/main.py
cors_origins = [
    "http://localhost:8000",
    "http://localhost:5173",
    "http://localhost:3000",
]
if main_vm_ip:
    cors_origins.extend([...])
```

**문제점**:
- Django와 FastAPI의 CORS 설정이 별도로 관리됨
- 프로덕션 도메인이 포함되어 있지 않음 (주석 처리됨)

---

## 6. 권장 조치 요약

### 즉시 조치 필요

| 우선순위 | 문제 | 조치 |
|----------|------|------|
| 1 | requirements.txt 인코딩 | `pip freeze > requirements.txt`로 재생성 |
| 2 | DEBUG 중복 정의 | settings.py 라인 26 제거 |
| 3 | Python 버전 통일 | 로컬 환경을 3.11로 맞추거나 Dockerfile 업그레이드 |

### 단기 조치 (1주일 내)

| 우선순위 | 문제 | 조치 |
|----------|------|------|
| 4 | NumPy 버전 | Django 백엔드도 1.26.4 사용 |
| 5 | HAPI FHIR 서비스 | docker-compose에 추가하거나 환경변수 제거 |
| 6 | Vite 프록시 | 환경변수로 설정 가능하도록 수정 |

### 중기 조치 (1개월 내)

| 우선순위 | 문제 | 조치 |
|----------|------|------|
| 7 | .env 파일 통합 | 환경별 .env 템플릿 정리 |
| 8 | base.py 정리 | 불필요한 설정 제거 또는 문서화 |
| 9 | GPU 리소스 | 단일 GPU 공유 설정 검토 |

---

## 부록: 환경 설정 체크리스트

### 로컬 개발 환경 설정

```bash
# 1. Python 버전 확인
python --version  # 3.11.x 권장

# 2. requirements.txt 재생성 (인코딩 수정)
cd brain_tumor_back
pip freeze > requirements.txt

# 3. .env 파일 확인
cat .env | grep DEBUG  # False 확인

# 4. 서비스 실행
python manage.py check
python manage.py runserver
```

### Docker 환경 설정

```bash
# 1. 필수 디렉토리 생성
mkdir -p ../CDSS_STORAGE ../patient_data

# 2. 환경변수 확인
cat docker/.env | grep MAIN_VM_IP

# 3. Docker Compose 실행
cd docker
docker compose -f docker-compose.unified.yml up -d --build

# 4. 서비스 상태 확인
docker compose ps
docker compose logs django
docker compose logs fastapi
```

---

*이 보고서는 코드 분석을 통해 자동 생성되었습니다. 실제 환경에서 추가 테스트가 필요합니다.*
