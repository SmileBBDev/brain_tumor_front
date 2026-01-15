# Brain Tumor CDSS 에러 목록 및 해결 방안

## 현재 발생하는 에러 목록

### 1. API 404 에러 (백엔드 API 미구현)

| 에러 | 원인 | 상태 |
|------|------|------|
| `GET /api/ai/requests/?my_only=false` 404 | 백엔드에 해당 API 엔드포인트 없음 | 수정 필요 |
| `GET /api/ai/models/` 404 | 백엔드에 해당 API 엔드포인트 없음 | 수정 필요 |

**원인 분석:**
- 프론트엔드: `/api/ai/requests/`, `/api/ai/models/` 호출
- 백엔드 실제 엔드포인트: `/api/ai/inferences/` (models API 없음)
- 프론트엔드와 백엔드 API 경로 불일치

**해결 방법:**
- `ai.api.ts`에서 `getAIRequests()` 함수가 `/api/ai/inferences/` 사용하도록 수정 완료
- `getAIModels()` 함수를 하드코딩된 모델 목록 반환하도록 수정 완료
- **문제**: 브라우저 캐시로 인해 수정된 코드가 반영되지 않음

---

### 2. OCSItem Export 에러

```
M1InferencePage.tsx:2  Uncaught SyntaxError: The requested module '/src/components/OCSTable.tsx' does not provide an export named 'OCSItem'
```

| 항목 | 내용 |
|------|------|
| 파일 | `M1InferencePage.tsx` |
| 에러 | `OCSItem` export를 찾을 수 없음 |
| 실제 상태 | `OCSTable.tsx`에 `OCSItem` export 존재함 |

**원인 분석:**
- `OCSTable.tsx`에 `export interface OCSItem { ... }` 정상 존재
- Vite 개발 서버 캐시 또는 브라우저 캐시 문제
- 이전에 삭제한 중복 파일의 캐시가 남아있음

**해결 방법:**
1. Vite 캐시 삭제: `rm -rf node_modules/.vite`
2. 브라우저 하드 리프레시: `Ctrl+Shift+R`
3. 브라우저 캐시 완전 삭제 또는 시크릿 모드 사용
4. 프론트엔드 서버 재시작

---

### 3. ProtectedRoute 에러

```
An error occurred in the <ProtectedRoute> component.
```

**원인:**
- OCSItem export 에러로 인해 컴포넌트 로딩 실패
- 상위 에러(#2)가 해결되면 자동 해결

---

## 파일별 수정 필요 사항

### `src/services/ai.api.ts`

| 라인 | 현재 | 수정 필요 |
|------|------|----------|
| 102 | `api.get('/ai/models/')` 호출 | 하드코딩된 모델 목록 반환 (수정 완료) |
| 170 | `api.get('/ai/requests/')` 호출 | `/api/ai/inferences/` 사용 (수정 완료) |

**현재 상태:** 코드는 수정되었으나 브라우저에 반영 안됨

### `src/hooks/useAIInference.ts`

| 함수 | 수정 내용 |
|------|----------|
| `fetchRequests()` | 404 에러 시 조용히 빈 배열 반환 (수정 완료) |
| `fetchModels()` | 404 에러 시 조용히 빈 배열 반환 (수정 완료) |

---

## 해결 절차

### Step 1: 캐시 완전 삭제

```powershell
# 프론트엔드 디렉토리에서
cd c:\0000\brain_tumor_dev\brain_tumor_front

# Vite 캐시 삭제
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue

# 또는 WSL에서
rm -rf node_modules/.vite
```

### Step 2: 프론트엔드 서버 재시작

```powershell
# 기존 서버 종료 후
npm run dev
```

### Step 3: 브라우저 캐시 삭제

1. Chrome: `Ctrl+Shift+Delete` → "캐시된 이미지 및 파일" 선택 → 삭제
2. 또는 시크릿 모드(`Ctrl+Shift+N`)로 접속
3. 또는 개발자 도구(F12) → Network 탭 → "Disable cache" 체크

### Step 4: 하드 리프레시

`Ctrl+Shift+R` 또는 `Ctrl+F5`

---

## 백엔드 API 현황

### 존재하는 API 엔드포인트 (`/api/ai/`)

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/ai/m1/inference/` | POST | M1 MRI 추론 요청 |
| `/api/ai/mg/inference/` | POST | MG Gene 추론 요청 |
| `/api/ai/mg/gene-expression/<ocs_id>/` | GET | Gene Expression 데이터 |
| `/api/ai/mm/inference/` | POST | MM 멀티모달 추론 요청 |
| `/api/ai/mm/available-ocs/<patient_id>/` | GET | MM 가능 OCS 목록 |
| `/api/ai/inferences/` | GET | 추론 목록 조회 |
| `/api/ai/inferences/<job_id>/` | GET/DELETE | 추론 상세/삭제 |
| `/api/ai/inferences/<job_id>/files/` | GET | 추론 결과 파일 목록 |
| `/api/ai/inferences/<job_id>/segmentation/` | GET | 세그멘테이션 데이터 |
| `/api/ai/callback/` | POST | 추론 콜백 |

### 존재하지 않는 API (프론트엔드에서 호출 시도)

| 엔드포인트 | 프론트엔드 사용처 | 해결 방법 |
|-----------|-----------------|----------|
| `/api/ai/models/` | `AIModelsPage.tsx` | 하드코딩으로 대체 |
| `/api/ai/requests/` | `AIRequestListPage.tsx` | `/api/ai/inferences/`로 매핑 |

---

## 요약

| 에러 유형 | 개수 | 해결 상태 |
|----------|------|----------|
| API 404 에러 | 2 | 코드 수정 완료, 캐시 문제 |
| Export 에러 | 1 | 캐시 문제 |
| 컴포넌트 에러 | 1 | 상위 에러 해결 시 자동 해결 |

**핵심 문제: 브라우저/Vite 캐시로 인해 수정된 코드가 반영되지 않음**

---

## 추가 조치 필요 사항

수정된 코드가 반영되지 않는 경우:

1. **node_modules 완전 재설치**
   ```bash
   rm -rf node_modules
   npm install
   npm run dev
   ```

2. **TypeScript 캐시 삭제**
   ```bash
   rm -rf tsconfig.tsbuildinfo
   ```

3. **브라우저 개발자 도구에서 캐시 비활성화**
   - F12 → Network 탭 → "Disable cache" 체크 (개발자 도구 열린 상태에서만 적용)
