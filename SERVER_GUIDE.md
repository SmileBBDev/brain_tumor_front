# Brain Tumor CDSS 서버 실행 가이드

## 개요

이 프로젝트는 3개의 서버로 구성되어 있습니다:

| 서버 | 포트 | 설명 |
|------|------|------|
| Frontend (React) | 5173 | 사용자 UI |
| Backend (Django) | 8000 | REST API + WebSocket |
| ModAI (FastAPI) | 8001 | AI 추론 서버 |

---

## 1. Frontend 서버 (React + Vite)

### 위치
```
c:\0000\brain_tumor_dev\brain_tumor_front
```

### 실행 방법

**Windows PowerShell:**
```powershell
cd c:\0000\brain_tumor_dev\brain_tumor_front
npm run dev
```

**WSL (권장):**
```bash
cd /mnt/c/0000/brain_tumor_dev/brain_tumor_front
npm run dev
```

### 접속 URL
```
http://localhost:5173
```

### 주요 명령어
| 명령어 | 설명 |
|--------|------|
| `npm install` | 의존성 설치 |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |

### 환경 변수 (.env)
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
```

---

## 2. Backend 서버 (Django + Daphne)

### 위치
```
c:\0000\brain_tumor_dev\backend\brain_tumor_back
```

### 실행 방법

**1단계: 가상환경 활성화**

Windows PowerShell:
```powershell
cd c:\0000\brain_tumor_dev\backend\brain_tumor_back
.\venv\Scripts\activate
```

Windows CMD:
```cmd
cd c:\0000\brain_tumor_dev\backend\brain_tumor_back
venv\Scripts\activate.bat
```

**2단계: 서버 실행**

Daphne (WebSocket 지원, 권장):
```bash
python -m daphne -b 127.0.0.1 -p 8000 config.asgi:application
```

또는 Django runserver (개발용):
```bash
python manage.py runserver 0.0.0.0:8000
```

### 접속 URL
```
http://localhost:8000          # API
http://localhost:8000/api/docs # Swagger 문서
ws://localhost:8000/ws/        # WebSocket
```

### 주요 명령어
| 명령어 | 설명 |
|--------|------|
| `pip install -r requirements.txt` | 의존성 설치 |
| `python manage.py migrate` | DB 마이그레이션 |
| `python manage.py createsuperuser` | 관리자 계정 생성 |
| `python manage.py runserver` | 개발 서버 (WebSocket 미지원) |
| `python -m daphne ...` | ASGI 서버 (WebSocket 지원) |

### 환경 변수
Django 설정은 `config/settings.py` 또는 환경별 설정 파일 참조

---

## 3. ModAI 서버 (FastAPI) - AI 추론

### 위치
```
c:\0000\brain_tumor_dev\backend\modAI
```

### 실행 방법

**1단계: 가상환경 활성화**

Windows PowerShell:
```powershell
cd c:\0000\brain_tumor_dev\backend\modAI
.\venv\Scripts\activate
```

**2단계: 서버 실행**
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

또는
```bash
python main.py
```

### 접속 URL
```
http://localhost:8001          # API
http://localhost:8001/docs     # Swagger 문서
```

---

## 전체 서버 실행 순서 (권장)

### 터미널 1: Backend
```powershell
cd c:\0000\brain_tumor_dev\backend\brain_tumor_back
.\venv\Scripts\activate
python -m daphne -b 127.0.0.1 -p 8000 config.asgi:application
```

### 터미널 2: ModAI (AI 추론이 필요한 경우)
```powershell
cd c:\0000\brain_tumor_dev\backend\modAI
.\venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 터미널 3: Frontend
```powershell
cd c:\0000\brain_tumor_dev\brain_tumor_front
npm run dev
```

---

## 서버 상태 확인

### Frontend
브라우저에서 `http://localhost:5173` 접속

### Backend
```bash
curl http://localhost:8000/api/auth/
```
또는 브라우저에서 `http://localhost:8000/api/docs` 접속

### ModAI
```bash
curl http://localhost:8001/health
```
또는 브라우저에서 `http://localhost:8001/docs` 접속

---

## 문제 해결

### Port already in use (포트 사용 중)

Windows에서 포트 사용 프로세스 확인:
```powershell
netstat -ano | findstr :8000
```

프로세스 종료:
```powershell
taskkill /PID <PID> /F
```

### 가상환경 활성화 안됨

PowerShell 실행 정책 변경:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### npm 명령어 인식 안됨

Node.js 설치 확인:
```powershell
node --version
npm --version
```

### Django 마이그레이션 오류

```bash
python manage.py makemigrations
python manage.py migrate
```

---

## 개발 팁

1. **VS Code 터미널 분할**: `Ctrl+Shift+5`로 터미널을 분할하여 3개 서버를 동시에 실행

2. **Hot Reload**: Frontend와 ModAI는 코드 변경 시 자동 새로고침

3. **로그 확인**: 각 터미널에서 실시간 로그 확인 가능

4. **API 테스트**: Backend Swagger UI (`/api/docs`)에서 API 테스트 가능
