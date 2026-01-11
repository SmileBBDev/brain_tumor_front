# LocalStorage 명명 규칙 가이드

## 개요

NeuroNova CDSS 프론트엔드에서 사용하는 LocalStorage 키 명명 규칙입니다.

---

## 1. 인증 토큰

JWT 토큰 저장에 사용됩니다.

| 키 | 설명 | 형식 |
|----|------|------|
| `accessToken` | JWT 액세스 토큰 | string |
| `refreshToken` | JWT 리프레시 토큰 | string |

### 사용 위치

| 파일 | 라인 | 동작 |
|------|------|------|
| `src/pages/auth/LoginPage.tsx` | 40-41 | setItem (로그인 시 저장) |
| `src/pages/auth/AuthProvider.tsx` | 67, 107 | getItem (토큰 확인) |
| `src/pages/auth/AuthProvider.tsx` | 153-154 | removeItem (로그아웃) |
| `src/services/api.ts` | 13 | getItem (API 요청 시 사용) |
| `src/services/api.ts` | 40-41 | setItem (토큰 갱신) |
| `src/services/api.ts` | 47 | clear (인증 실패 시 전체 삭제) |
| `src/api/http.js` | 12 | getItem (레거시 API) |
| `src/socket/ocsSocket.ts` | 58 | getItem (WebSocket 인증) |

---

## 2. OCS Draft 데이터

OCS 작업 중 임시 저장에 사용됩니다.

### 키 형식

```
CDSS_LOCAL_STORAGE:{ROLE}:{OCS_ID}:{TYPE}
```

| 세그먼트 | 설명 | 예시 |
|----------|------|------|
| `CDSS_LOCAL_STORAGE` | 프리픽스 (상수) | - |
| `ROLE` | 작업자 역할 | `DOCTOR`, `RIS`, `LIS` |
| `OCS_ID` | OCS 오더 ID | `123`, `456` |
| `TYPE` | 데이터 유형 | `request`, `result`, `files`, `meta` |

### TYPE 종류

| TYPE | 설명 | ROLE |
|------|------|------|
| `request` | 의사 요청 데이터 | 항상 `DOCTOR` |
| `result` | 작업 결과 데이터 | `RIS`, `LIS` 등 |
| `files` | 첨부 파일 메타데이터 | 작업자 역할 |
| `meta` | 기타 메타 정보 | 작업자 역할 |

### 예시

```
CDSS_LOCAL_STORAGE:DOCTOR:123:request   # 의사 요청
CDSS_LOCAL_STORAGE:RIS:123:result       # 영상과 결과
CDSS_LOCAL_STORAGE:LIS:456:files        # 검사과 첨부파일
```

### 사용 위치

| 파일 | 라인 | 함수 | 설명 |
|------|------|------|------|
| `src/services/ocs.api.ts` | 433 | - | `STORAGE_PREFIX` 상수 정의 |
| `src/services/ocs.api.ts` | 436-443 | `getLocalStorageKey()` | 키 생성 함수 |
| `src/services/ocs.api.ts` | 446-448 | `saveDraft()` | Draft 저장 |
| `src/services/ocs.api.ts` | 451-454 | `getDraft()` | Draft 조회 |
| `src/services/ocs.api.ts` | 457-459 | `removeDraft()` | Draft 삭제 |
| `src/services/ocs.api.ts` | 462-468 | `clearOCSDrafts()` | OCS별 전체 Draft 삭제 |

---

## 3. 명명 규칙 요약

### 네이밍 컨벤션

| 구분 | 규칙 | 예시 |
|------|------|------|
| 인증 토큰 | camelCase | `accessToken`, `refreshToken` |
| OCS Draft | SCREAMING_SNAKE:UPPER:id:lower | `CDSS_LOCAL_STORAGE:RIS:123:result` |

### 데이터 형식

| 키 유형 | 저장 형식 |
|---------|----------|
| 인증 토큰 | Plain string |
| OCS Draft | JSON.stringify() |

---

## 4. 유틸리티 함수 사용법

### Draft 저장

```typescript
import { getLocalStorageKey, saveDraft } from '@/services/ocs.api';

const key = getLocalStorageKey('RIS', '123', 'result');
saveDraft(key, { findings: '...', impression: '...' });
```

### Draft 조회

```typescript
import { getLocalStorageKey, getDraft } from '@/services/ocs.api';

const key = getLocalStorageKey('RIS', '123', 'result');
const data = getDraft<ResultType>(key);
```

### Draft 삭제

```typescript
import { clearOCSDrafts } from '@/services/ocs.api';

// OCS 123의 RIS 관련 모든 Draft 삭제
clearOCSDrafts('RIS', '123');
```

---

## 5. 주의사항

1. **토큰 보안**: `accessToken`, `refreshToken`은 민감한 데이터이므로 XSS 취약점에 주의
2. **용량 제한**: LocalStorage 용량은 브라우저별로 5-10MB 제한
3. **JSON 파싱**: Draft 데이터는 JSON으로 저장되므로 조회 시 파싱 에러 처리 필요
4. **정리**: OCS 작업 완료 시 `clearOCSDrafts()` 호출하여 불필요한 데이터 정리

---

## 6. 향후 추가 시 규칙

새로운 LocalStorage 키 추가 시:

1. **프리픽스 사용**: `CDSS_` 프리픽스로 시작
2. **일관된 구분자**: `:` (콜론) 사용
3. **대문자 역할**: 역할/카테고리는 UPPER_CASE
4. **소문자 타입**: 데이터 타입은 lowercase
5. **유틸리티 함수**: 직접 `localStorage` 접근 대신 유틸리티 함수 사용 권장
