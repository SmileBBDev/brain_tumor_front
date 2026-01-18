# NeuroNova CDSS 보안 체크리스트

나중에 프로덕션 배포 전 확인해야 할 보안 사항들입니다.

---

## 1. 백엔드 (Django) 보안

### 1.1 CRITICAL - 즉시 수정 필요

| 항목 | 현재 상태 | 수정 방법 | 파일 위치 |
|------|----------|----------|----------|
| SECRET_KEY | `your-secret-key` 기본값 | 50자 이상 랜덤 문자열 생성 | `.env` |
| DEBUG | True (중복 설정됨) | `DEBUG=False` | `config/settings.py:26` |
| CORS | 모든 도메인 허용 | 특정 도메인만 허용 | `config/base.py:46` |
| ALLOWED_HOSTS | `*` 와일드카드 | 실제 도메인만 지정 | `.env`, `settings.py` |

#### SECRET_KEY 생성 방법
```python
# Python에서 실행
import secrets
print(secrets.token_urlsafe(50))
```

#### DEBUG 중복 설정 수정
```python
# config/settings.py - 라인 26 삭제
# DEBUG = env.bool("DEBUG", default=True)  # 이 줄 삭제
```

### 1.2 HIGH - 배포 전 수정 권장

| 항목 | 설명 | 수정 방법 |
|------|------|----------|
| AllowAny 권한 과다 | Orthanc 프록시 8개 엔드포인트 | `IsAuthenticated`로 변경 |
| 에러 메시지 노출 | `str(e)` 직접 반환 | 일반화된 메시지 사용 |
| 테스트 계정 | 22개+ 하드코딩됨 | 프로덕션에서 제외 |
| 이메일 비밀번호 | `.env`에 평문 저장 | 환경변수 또는 Secrets Manager |

#### AllowAny 수정 대상 파일
- `apps/orthancproxy/views.py` - 8개 엔드포인트
- `apps/ai_inference/views.py` - AIInferenceCallbackView
- `apps/accounts/views.py` - UserToggleActiveView

#### 에러 메시지 수정
```python
# Before (위험)
except Exception as e:
    return Response({'detail': str(e)}, status=500)

# After (안전)
except Exception as e:
    logger.error(f"Error: {e}")
    return Response({'detail': '서버 오류가 발생했습니다.'}, status=500)
```

---

## 2. 프론트엔드 (React) 보안

### 2.1 CRITICAL - XSS 취약점

| 파일 | 문제 | 해결 방법 |
|------|------|----------|
| `utils/exportUtils.ts` | innerHTML에 사용자 데이터 삽입 | HTML 이스케이프 함수 적용 |

#### HTML 이스케이프 함수
```typescript
// src/utils/security.ts
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};

// 사용 예시
container.innerHTML = `<div>${escapeHtml(data.patientName)}</div>`;
```

### 2.2 HIGH - 토큰 저장

| 항목 | 현재 상태 | 권장 |
|------|----------|------|
| accessToken | localStorage | HttpOnly 쿠키 |
| refreshToken | localStorage | HttpOnly 쿠키 |
| WebSocket 토큰 | URL 파라미터 | 헤더 전달 |

### 2.3 MEDIUM - 코드 품질

| 항목 | 개수 | 조치 |
|------|------|------|
| `any` 타입 사용 | 153개 | 구체적 타입으로 변경 |
| console.log | 386개 | 프로덕션 빌드에서 제거 |
| @ts-ignore | 4개 | 타입 정의 추가 |

#### console.log 제거 (Vite)
```typescript
// vite.config.ts
export default defineConfig({
  esbuild: {
    drop: ['console', 'debugger'],  // 프로덕션에서 제거
  },
});
```

---

## 3. 환경변수 파일 보안

### 3.1 .gitignore 확인
```
# .gitignore에 반드시 포함
.env
.env.local
.env.*.local
docker/.env
```

### 3.2 프로덕션 환경변수 예시
```env
# NEVER commit these values
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=실제_비밀키_50자_이상
DJANGO_ALLOWED_HOSTS=your-domain.com,www.your-domain.com
DJANGO_DB_PASS=강력한_비밀번호
EMAIL_HOST_PASSWORD=앱_비밀번호
```

---

## 4. 데이터베이스 보안

### 4.1 MySQL 설정
```sql
-- 기본 root 비밀번호 변경
ALTER USER 'root'@'localhost' IDENTIFIED BY '강력한_비밀번호';

-- 전용 사용자 생성 (root 대신 사용)
CREATE USER 'cdss_app'@'%' IDENTIFIED BY '비밀번호';
GRANT SELECT, INSERT, UPDATE, DELETE ON brain_tumor.* TO 'cdss_app'@'%';
FLUSH PRIVILEGES;
```

### 4.2 백업 정책
```bash
# 일일 백업 스크립트 (crontab)
0 2 * * * mysqldump -u root -p'비밀번호' brain_tumor | gzip > /backup/db_$(date +\%Y\%m\%d).sql.gz
```

---

## 5. 네트워크 보안

### 5.1 포트 노출 최소화
```yaml
# docker-compose.production.yml
services:
  django:
    expose:
      - "8000"  # 내부만 노출
    # ports: X  # 외부 노출 제거

  nginx:
    ports:
      - "80:80"
      - "443:443"  # Nginx만 외부 노출
```

### 5.2 방화벽 설정
```bash
# UFW 예시
sudo ufw default deny incoming
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## 6. 모니터링 및 로깅

### 6.1 로깅 설정
```python
# Django settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/security.log',
        },
    },
    'loggers': {
        'django.security': {
            'handlers': ['file'],
            'level': 'WARNING',
        },
    },
}
```

### 6.2 보안 이벤트 모니터링
- 로그인 실패 추적
- 비정상 API 호출 탐지
- 파일 업로드 모니터링

---

## 7. 체크리스트 요약

### 배포 전 필수 (MUST)
- [ ] SECRET_KEY 변경
- [ ] DEBUG=False 설정
- [ ] CORS 도메인 제한
- [ ] ALLOWED_HOSTS 설정
- [ ] .env 파일 .gitignore 확인
- [ ] DB 비밀번호 변경

### 배포 후 권장 (SHOULD)
- [ ] SSL/HTTPS 적용
- [ ] XSS 취약점 수정
- [ ] AllowAny 권한 검토
- [ ] 에러 메시지 일반화
- [ ] 테스트 계정 제거
- [ ] 로깅 설정

### 장기 개선 (COULD)
- [ ] HttpOnly 쿠키로 토큰 관리
- [ ] any 타입 제거 (153개)
- [ ] console.log 제거 (386개)
- [ ] CI/CD 보안 스캔 통합

---

## 8. 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security](https://docs.djangoproject.com/en/4.2/topics/security/)
- [React Security Best Practices](https://react.dev/learn/security)
- [Docker Security](https://docs.docker.com/engine/security/)
