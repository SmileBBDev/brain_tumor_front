#!/bin/bash
# =============================================================
# start.sh - Docker Compose 시작 스크립트
# =============================================================
# 사용법: ./start.sh
#
# fastapi 이미지를 먼저 빌드한 후 전체 서비스를 시작합니다.
# fastapi-celery는 빌드된 nn-fastapi:latest 이미지를 공유합니다.
# =============================================================

set -e

echo "=========================================="
echo "  Brain Tumor CDSS - Docker 시작"
echo "=========================================="

# 1단계: fastapi, django 이미지 빌드
echo ""
echo "[1/2] 이미지 빌드 중..."
docker compose -f docker-compose.unified.yml build fastapi django

# 2단계: 전체 서비스 시작
echo ""
echo "[2/2] 서비스 시작 중..."
docker compose -f docker-compose.unified.yml up -d

echo ""
echo "=========================================="
echo "  완료! 서비스 상태 확인:"
echo "  docker compose -f docker-compose.unified.yml ps"
echo "=========================================="
