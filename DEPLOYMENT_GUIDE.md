# Brain Tumor CDSS 배포 가이드

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [시스템 요구사항](#2-시스템-요구사항)
3. [아키텍처](#3-아키텍처)
4. [사전 준비](#4-사전-준비)
5. [환경 변수 설정](#5-환경-변수-설정)
6. [배포 절차](#6-배포-절차)
7. [서비스 관리](#7-서비스-관리)
8. [모니터링 및 로그](#8-모니터링-및-로그)
9. [백업 및 복원](#9-백업-및-복원)
10. [문제 해결](#10-문제-해결)
11. [보안 설정](#11-보안-설정)
12. [부록](#12-부록)

---

## 1. 시스템 개요

Brain Tumor CDSS(Clinical Decision Support System)는 의료 영상 분석을 위한 마이크로서비스 기반 웹 애플리케이션입니다.

### 주요 기능

- 뇌종양 MRI 영상 분석 및 진단 지원
- DICOM 의료 영상 관리
- 실시간 AI 추론 (M1, MG, MM 모델)
- 환자 정보 관리 및 EMR 연동
- WebSocket 기반 실시간 알림

### 기술 스택

| 구성요소 | 기술 | 버전 |
|---------|------|------|
| Frontend | React + TypeScript + Vite | React 19.x |
| Backend | Django REST Framework | Django 5.2 |
| AI Service | FastAPI + PyTorch | FastAPI 0.128 |
| Database | MySQL | 8.0 |
| Cache | Redis | 7.x |
| DICOM Server | Orthanc | Latest |
| Reverse Proxy | Nginx | Alpine |
| Container | Docker + Docker Compose | v2+ |

---

## 2. 시스템 요구사항

### 2.1 메인 VM (Django + Orthanc)

| 항목 | 최소 요구사항 | 권장 사양 |
|------|-------------|----------|
| CPU | 4 Core | 8 Core |
| RAM | 8 GB | 16 GB |
| Storage | 100 GB SSD | 500 GB SSD |
| OS | Ubuntu 20.04+ / Windows Server 2019+ | Ubuntu 22.04 LTS |
| Network | 1 Gbps | 10 Gbps |

### 2.2 FastAPI VM (AI 추론 서버)

| 항목 | 최소 요구사항 | 권장 사양 |
|------|-------------|----------|
| CPU | 8 Core | 16 Core |
| RAM | 16 GB | 32 GB |
| GPU | NVIDIA RTX 3060 (8GB VRAM) | NVIDIA RTX 4090 (24GB VRAM) |
| Storage | 200 GB SSD | 1 TB NVMe SSD |
| OS | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| CUDA | 11.8+ | 12.1+ |

### 2.3 소프트웨어 요구사항

```bash
# 필수 소프트웨어
- Docker Engine 24.0+
- Docker Compose v2.0+
- Python 3.11+ (setup.py 실행용)
- Git

# FastAPI VM 추가 요구사항
- NVIDIA Driver 525+
- NVIDIA Container Toolkit
- CUDA 12.1+
```

---

## 3. 아키텍처

### 3.1 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              사용자 (웹 브라우저)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Cloudflare (CDN/SSL/WAF)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              메인 VM (Production)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Nginx (Reverse Proxy)                           │   │
│  │                         :80 / :443                                   │   │
│  └──────┬──────────────────┬──────────────────┬──────────────────┬─────┘   │
│         │                  │                  │                  │          │
│         ▼                  ▼                  ▼                  ▼          │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐      │
│  │   React    │    │   Django   │    │  Orthanc   │    │  OpenEMR   │      │
│  │  Frontend  │    │   (API)    │    │  (DICOM)   │    │   (EMR)    │      │
│  │  (Static)  │    │   :8000    │    │   :8042    │    │   :8080    │      │
│  └────────────┘    └─────┬──────┘    └────────────┘    └────────────┘      │
│                          │                                                  │
│                    ┌─────┴─────┐                                            │
│                    ▼           ▼                                            │
│             ┌──────────┐ ┌──────────┐                                       │
│             │  MySQL   │ │  Redis   │                                       │
│             │  :3306   │ │  :6379   │                                       │
│             └──────────┘ └──────────┘                                       │
│                                                                             │
│                          medical-net (Docker Network)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                           HTTP (내부 네트워크)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FastAPI VM (AI 추론 서버)                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   FastAPI    │    │   Celery     │    │    Redis     │                   │
│  │   (AI API)   │────│   Worker     │────│   (Broker)   │                   │
│  │    :9000     │    │   (GPU)      │    │    :6380     │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                             │
│                          fastapi-net (Docker Network)                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 서비스 포트 구성

| 서비스 | 내부 포트 | 외부 포트 | 설명 |
|--------|----------|----------|------|
| Nginx | 80, 443 | 80, 443 | 리버스 프록시 |
| Django | 8000 | 8000 | REST API + WebSocket |
| MySQL | 3306 | 3306 | 데이터베이스 |
| Redis (Main) | 6379 | 6379 | 캐시 + Channel Layer |
| Orthanc HTTP | 8042 | 8042 | DICOM 웹 UI |
| Orthanc DICOM | 4242 | 4242 | DICOM 프로토콜 |
| FastAPI | 9000 | 9000 | AI 추론 API |
| Redis (FastAPI) | 6380 | 6380 | Celery Broker |
| OpenEMR | 8080 | 8080 | EMR 시스템 |
| HAPI FHIR | 8081 | 8081 | FHIR 서버 |

---

## 4. 사전 준비

### 4.1 Docker 설치 (Ubuntu)

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose 확인 (Docker Engine에 포함)
docker compose version
```

### 4.2 Docker 설치 (Windows)

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) 다운로드 및 설치
2. WSL 2 백엔드 활성화
3. 시스템 재시작 후 Docker Desktop 실행

### 4.3 NVIDIA Container Toolkit 설치 (FastAPI VM)

```bash
# NVIDIA 드라이버 확인
nvidia-smi

# NVIDIA Container Toolkit 저장소 추가
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

# 설치
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Docker 재시작
sudo systemctl restart docker

# GPU 테스트
docker run --rm --gpus all nvidia/cuda:12.1-base nvidia-smi
```

### 4.4 프로젝트 클론

```bash
# 메인 VM
git clone <repository-url> /opt/brain_tumor_dev
cd /opt/brain_tumor_dev

# FastAPI VM (docker, modAI 폴더만 필요)
scp -r user@main-vm:/opt/brain_tumor_dev/docker /opt/brain_tumor_dev/
scp -r user@main-vm:/opt/brain_tumor_dev/modAI /opt/brain_tumor_dev/
```

---

## 5. 환경 변수 설정

### 5.1 메인 VM 환경 변수 (.env)

```bash
cd /opt/brain_tumor_dev/docker
cp .env.example .env
```

**.env 파일 편집:**

```env
# ============================================
# 메인 VM 환경 변수
# ============================================

# Django 설정
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=your-super-secret-key-change-this
DJANGO_ALLOWED_HOSTS=*,localhost,127.0.0.1,your-domain.com

# 데이터베이스 설정
DJANGO_DB_NAME=brain_tumor
DJANGO_DB_USER=root
DJANGO_DB_PASS=secure-password-here
DJANGO_DB_HOST=nn-django-db
DJANGO_DB_PORT=3306

# MySQL Root 비밀번호
MYSQL_ROOT_PASSWORD=secure-password-here

# Redis 설정
REDIS_HOST=nn-redis
REDIS_PORT=6379
REDIS_URL=redis://nn-redis:6379/0

# FastAPI VM 연결 (⚠️ 실제 FastAPI VM IP로 변경)
FASTAPI_URL=http://192.168.1.200:9000

# Orthanc 설정
ORTHANC_URL=http://nn-orthanc:8042
ORTHANC_USER=orthanc
ORTHANC_PASSWORD=orthanc

# 이메일 설정 (선택)
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### 5.2 FastAPI VM 환경 변수

**docker/.env:**

```env
# ============================================
# FastAPI VM 환경 변수
# ============================================

# 서버 설정
HOST=0.0.0.0
PORT=9000
DEBUG=false
APP_ENV=production

# ⚠️ 메인 VM IP 주소 (필수!)
MAIN_VM_IP=192.168.1.100

# Redis 설정
REDIS_URL=redis://nn-fastapi-redis:6379/0
CELERY_BROKER_URL=redis://nn-fastapi-redis:6379/1
CELERY_RESULT_BACKEND=redis://nn-fastapi-redis:6379/2

# GPU 설정 (setup.py가 자동 설정)
USE_GPU=true
CUDA_VISIBLE_DEVICES=0
DEVICE=auto
```

**modAI/.env:**

```env
# ============================================
# modAI 환경 변수
# ============================================

# ⚠️ 메인 VM IP 주소 (필수!)
MAIN_VM_IP=192.168.1.100

# 자동 생성되는 URL (주석 해제하여 직접 설정 가능)
# ORTHANC_URL=http://192.168.1.100:8042
# DJANGO_URL=http://192.168.1.100:8000

# Orthanc 인증
ORTHANC_USER=orthanc
ORTHANC_PASSWORD=orthanc

# Redis
REDIS_URL=redis://nn-fastapi-redis:6379/0
CELERY_BROKER_URL=redis://nn-fastapi-redis:6379/1
CELERY_RESULT_BACKEND=redis://nn-fastapi-redis:6379/2
```

### 5.3 프론트엔드 환경 변수

**brain_tumor_front/.env:**

```env
# 개발 환경
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws

# 프로덕션 환경
# VITE_API_BASE_URL=https://your-domain.com/api
# VITE_WS_URL=wss://your-domain.com/ws
```

---

## 6. 배포 절차

### 6.1 개발 환경 배포

#### 메인 VM

```bash
cd /opt/brain_tumor_dev/docker

# 1. 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 2. Django + MySQL + Redis + Orthanc 실행
docker compose -f docker-compose.django.yml up -d

# 3. 데이터베이스 마이그레이션
docker exec -it nn-django python manage.py migrate

# 4. 정적 파일 수집
docker exec -it nn-django python manage.py collectstatic --noinput

# 5. 초기 데이터 설정 (선택)
docker exec -it nn-django python manage.py setup_dummy_data

# 6. 서비스 상태 확인
docker compose -f docker-compose.django.yml ps
```

#### FastAPI VM

```bash
cd /opt/brain_tumor_dev/docker

# 1. 환경 체크 및 자동 설정 (필수!)
python setup.py

# 2. 환경 변수 설정
# docker/.env 및 modAI/.env 파일에서 MAIN_VM_IP 설정

# 3. FastAPI + Celery + Redis 실행
docker compose -f docker-compose.fastapi.yml up -d --build

# 4. 서비스 상태 확인
docker compose -f docker-compose.fastapi.yml ps

# 5. 메인 VM 연결 테스트
curl http://${MAIN_VM_IP}:8042/system
```

### 6.2 프로덕션 환경 배포

#### 프론트엔드 빌드

```bash
cd /opt/brain_tumor_dev/brain_tumor_front

# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# 빌드 결과물을 Nginx 폴더로 복사
cp -r dist/* ../docker/nginx/html/
```

#### 프로덕션 스택 실행

```bash
cd /opt/brain_tumor_dev/docker

# 1. Django + Orthanc + Redis 실행
docker compose -f docker-compose.django.yml up -d

# 2. Nginx (Production) 실행
docker compose -f docker-compose.production.yml up -d --build

# 3. EMR 연동 (선택)
docker compose -f docker-compose.emr.yml up -d

# 4. 서비스 상태 확인
docker compose -f docker-compose.django.yml ps
docker compose -f docker-compose.production.yml ps
```

### 6.3 배포 체크리스트

#### 메인 VM

- [ ] Docker 및 Docker Compose 설치 확인
- [ ] `.env` 파일 생성 및 설정
- [ ] `DJANGO_SECRET_KEY` 보안 키 생성
- [ ] `MYSQL_ROOT_PASSWORD` 설정
- [ ] `FASTAPI_URL` 설정 (FastAPI VM IP)
- [ ] `docker-compose.django.yml` 실행
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 방화벽 포트 개방 (8000, 8042, 6379)
- [ ] 헬스체크 확인: `curl http://localhost:8000/health/`

#### FastAPI VM

- [ ] NVIDIA 드라이버 설치 확인
- [ ] NVIDIA Container Toolkit 설치
- [ ] `python setup.py` 실행 (GPU 자동 감지)
- [ ] `docker/.env`에서 `MAIN_VM_IP` 설정
- [ ] `modAI/.env`에서 `MAIN_VM_IP` 설정
- [ ] `docker-compose.fastapi.yml` 빌드 및 실행
- [ ] 방화벽 포트 개방 (9000)
- [ ] 메인 VM 연결 테스트
- [ ] GPU 사용 확인: `docker exec nn-fastapi nvidia-smi`

#### 프로덕션

- [ ] 프론트엔드 빌드 완료
- [ ] SSL 인증서 설정 (Let's Encrypt 또는 Cloudflare)
- [ ] Nginx 설정 확인
- [ ] WebSocket 연결 테스트
- [ ] Cloudflare WebSocket 활성화 (사용 시)

---

## 7. 서비스 관리

### 7.1 서비스 시작/중지

```bash
# ============ 메인 VM ============
cd /opt/brain_tumor_dev/docker

# 전체 서비스 시작
docker compose -f docker-compose.django.yml up -d

# 전체 서비스 중지
docker compose -f docker-compose.django.yml down

# 특정 서비스만 재시작
docker compose -f docker-compose.django.yml restart django

# ============ FastAPI VM ============
# 전체 서비스 시작
docker compose -f docker-compose.fastapi.yml up -d

# 전체 서비스 중지
docker compose -f docker-compose.fastapi.yml down

# 이미지 재빌드 후 시작
docker compose -f docker-compose.fastapi.yml up -d --build
```

### 7.2 서비스 상태 확인

```bash
# 컨테이너 상태 확인
docker compose -f docker-compose.django.yml ps
docker compose -f docker-compose.fastapi.yml ps

# 헬스체크 확인
curl http://localhost:8000/health/    # Django
curl http://localhost:9000/health     # FastAPI
curl http://localhost:8042/system     # Orthanc

# 리소스 사용량 확인
docker stats
```

### 7.3 서비스 업데이트

```bash
# 코드 업데이트 후 재배포
cd /opt/brain_tumor_dev

# Git pull
git pull origin main

# Django 재시작 (코드 변경 시)
docker compose -f docker/docker-compose.django.yml restart django

# Django 마이그레이션 (모델 변경 시)
docker exec -it nn-django python manage.py migrate

# FastAPI 재빌드 (의존성 변경 시)
docker compose -f docker/docker-compose.fastapi.yml up -d --build
```

---

## 8. 모니터링 및 로그

### 8.1 로그 확인

```bash
# ============ 실시간 로그 ============
# Django 로그
docker compose -f docker-compose.django.yml logs -f django

# FastAPI 로그
docker compose -f docker-compose.fastapi.yml logs -f fastapi

# Celery Worker 로그
docker compose -f docker-compose.fastapi.yml logs -f fastapi-celery

# 전체 서비스 로그
docker compose -f docker-compose.django.yml logs -f

# ============ 로그 파일 위치 ============
# 컨테이너 내부 로그
docker exec -it nn-django cat /app/logs/django.log
```

### 8.2 로그 레벨별 필터링

```bash
# 에러 로그만 확인
docker compose -f docker-compose.django.yml logs django 2>&1 | grep -i error

# 최근 100줄만 확인
docker compose -f docker-compose.django.yml logs --tail 100 django
```

### 8.3 시스템 모니터링

```bash
# 컨테이너 리소스 사용량
docker stats

# GPU 사용량 (FastAPI VM)
watch -n 1 nvidia-smi

# 디스크 사용량
df -h
docker system df
```

---

## 9. 백업 및 복원

### 9.1 데이터베이스 백업

```bash
# MySQL 데이터베이스 백업
docker exec nn-django-db mysqldump -u root -p${MYSQL_ROOT_PASSWORD} brain_tumor > backup_$(date +%Y%m%d).sql

# 압축 백업
docker exec nn-django-db mysqldump -u root -p${MYSQL_ROOT_PASSWORD} brain_tumor | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 9.2 데이터베이스 복원

```bash
# MySQL 데이터베이스 복원
cat backup_20240101.sql | docker exec -i nn-django-db mysql -u root -p${MYSQL_ROOT_PASSWORD} brain_tumor

# 압축 파일 복원
gunzip < backup_20240101.sql.gz | docker exec -i nn-django-db mysql -u root -p${MYSQL_ROOT_PASSWORD} brain_tumor
```

### 9.3 Docker 볼륨 백업

```bash
# Django DB 볼륨 백업
docker run --rm \
  -v brain_tumor_dev_django_db_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/django_db_$(date +%Y%m%d).tar.gz -C /data .

# Orthanc 데이터 백업
docker run --rm \
  -v brain_tumor_dev_orthanc_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/orthanc_$(date +%Y%m%d).tar.gz -C /data .

# Redis 데이터 백업
docker run --rm \
  -v brain_tumor_dev_redis_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/redis_$(date +%Y%m%d).tar.gz -C /data .
```

### 9.4 Docker 볼륨 복원

```bash
# 볼륨 복원
docker run --rm \
  -v brain_tumor_dev_django_db_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/django_db_20240101.tar.gz -C /data
```

### 9.5 자동 백업 스크립트

`/opt/brain_tumor_dev/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p ${BACKUP_DIR}

# MySQL 백업
docker exec nn-django-db mysqldump -u root -p${MYSQL_ROOT_PASSWORD} brain_tumor | gzip > ${BACKUP_DIR}/db_${DATE}.sql.gz

# 오래된 백업 삭제 (30일 이상)
find ${BACKUP_DIR} -type f -mtime +30 -delete

echo "Backup completed: ${DATE}"
```

```bash
# Cron 작업 등록 (매일 새벽 3시)
crontab -e
# 추가: 0 3 * * * /opt/brain_tumor_dev/scripts/backup.sh
```

---

## 10. 문제 해결

### 10.1 일반적인 문제

#### Docker 서비스 연결 실패

```bash
# 네트워크 확인
docker network ls
docker network inspect brain_tumor_dev_medical-net

# 컨테이너 IP 확인
docker inspect nn-django | grep IPAddress

# 컨테이너 간 연결 테스트
docker exec nn-django ping nn-django-db
```

#### 포트 충돌

```bash
# 사용 중인 포트 확인
netstat -tlnp | grep :8000
lsof -i :8000

# 프로세스 종료
kill -9 <PID>
```

### 10.2 VM 간 통신 문제

```bash
# 1. 네트워크 연결 확인
ping ${MAIN_VM_IP}

# 2. 포트 연결 확인
telnet ${MAIN_VM_IP} 8000
curl http://${MAIN_VM_IP}:8042/system

# 3. 방화벽 확인 및 포트 개방
# Ubuntu
sudo ufw status
sudo ufw allow 8000/tcp
sudo ufw allow 9000/tcp
sudo ufw allow 8042/tcp

# CentOS/RHEL
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

### 10.3 GPU 관련 문제

```bash
# 1. NVIDIA 드라이버 확인
nvidia-smi

# 2. Docker GPU 지원 확인
docker run --rm --gpus all nvidia/cuda:12.1-base nvidia-smi

# 3. NVIDIA Container Toolkit 재설치
sudo apt-get remove nvidia-container-toolkit
sudo apt-get install nvidia-container-toolkit
sudo systemctl restart docker

# 4. setup.py 다시 실행
python setup.py

# 5. 컨테이너 GPU 사용 확인
docker exec nn-fastapi nvidia-smi
```

### 10.4 데이터베이스 연결 문제

```bash
# 1. DB 컨테이너 상태 확인
docker compose -f docker-compose.django.yml logs django-db

# 2. DB 직접 연결 테스트
docker exec -it nn-django-db mysql -u root -p

# 3. Django DB 연결 테스트
docker exec -it nn-django python manage.py dbshell
```

### 10.5 WebSocket 연결 문제

```bash
# 1. Redis 상태 확인
docker exec nn-redis redis-cli ping

# 2. Django Channels 로그 확인
docker compose -f docker-compose.django.yml logs django | grep -i websocket

# 3. WebSocket 연결 테스트 (wscat 사용)
npm install -g wscat
wscat -c ws://localhost:8000/ws/ai-inference/

# 4. Nginx WebSocket 프록시 확인 (Production)
docker compose -f docker-compose.production.yml logs nginx
```

### 10.6 메모리 부족

```bash
# 1. 메모리 사용량 확인
free -h
docker stats

# 2. 불필요한 이미지/컨테이너 정리
docker system prune -a

# 3. 로그 파일 정리
docker system prune --volumes
```

---

## 11. 보안 설정

### 11.1 환경 변수 보안

```bash
# .env 파일 권한 제한
chmod 600 .env

# .gitignore에 민감 파일 추가
echo ".env" >> .gitignore
echo "*.pem" >> .gitignore
echo "*.key" >> .gitignore
```

### 11.2 Django 보안 설정

```env
# Production 환경 변수
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<strong-random-key>
DJANGO_ALLOWED_HOSTS=your-domain.com,www.your-domain.com
```

### 11.3 방화벽 설정

```bash
# 필수 포트만 개방
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 웹 서비스
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 내부 네트워크에서만 접근 허용
sudo ufw allow from 192.168.1.0/24 to any port 8000
sudo ufw allow from 192.168.1.0/24 to any port 9000
sudo ufw allow from 192.168.1.0/24 to any port 8042

sudo ufw enable
```

### 11.4 SSL/TLS 설정

#### Let's Encrypt 사용

```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 확인
sudo certbot renew --dry-run
```

#### Cloudflare 사용

1. Cloudflare Dashboard에서 SSL/TLS → Full (strict) 설정
2. Origin Certificates 발급
3. Nginx에 인증서 적용

### 11.5 컨테이너 보안

```yaml
# docker-compose에 보안 옵션 추가
services:
  django:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

---

## 12. 부록

### 12.1 유용한 명령어 모음

```bash
# ============ Docker 관리 ============
# 모든 컨테이너 상태
docker ps -a

# 컨테이너 쉘 접속
docker exec -it nn-django /bin/bash

# 이미지 목록
docker images

# 사용하지 않는 리소스 정리
docker system prune -a --volumes

# ============ 서비스 관리 ============
# Django 관리 명령어
docker exec -it nn-django python manage.py <command>

# Django 쉘
docker exec -it nn-django python manage.py shell

# MySQL 접속
docker exec -it nn-django-db mysql -u root -p

# Redis CLI
docker exec -it nn-redis redis-cli

# ============ 로그 ============
# 실시간 전체 로그
docker compose -f docker-compose.django.yml logs -f

# 특정 시간 이후 로그
docker compose -f docker-compose.django.yml logs --since "2024-01-01"
```

### 12.2 환경 변수 템플릿

전체 환경 변수 목록은 `docker/.env.example` 파일을 참조하세요.

### 12.3 API 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /health/` | Django 헬스체크 |
| `GET /api/` | API 루트 |
| `GET /api/docs/` | Swagger API 문서 |
| `GET /admin/` | Django 관리자 |
| `WS /ws/ai-inference/` | AI 추론 WebSocket |
| `GET /orthanc/` | DICOM 뷰어 |

### 12.4 AI 모델 정보

| 모델 | 용도 | Celery Queue |
|------|------|--------------|
| M1 | 뇌종양 분할 | m1_queue |
| MG | 등급 분류 | mg_queue |
| MM | 분자 마커 예측 | mm_queue |

### 12.5 연락처 및 지원

문제 발생 시:
1. 본 문서의 문제 해결 섹션 확인
2. `docker/README.md` 참조
3. 로그 파일 분석
4. 시스템 관리자에게 문의

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2024-01-19 | 최초 작성 |
