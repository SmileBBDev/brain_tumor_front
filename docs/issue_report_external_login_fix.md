# 이슈 보고서: 외부기관(EXTERNAL) 로그인 실패 문제

## 개요
- **발생일**: 2026-01-19
- **영향 범위**: 외부기관 계정 (ext_snuh, ext_amc, ext_smc 등)
- **증상**: `ext_snuh/ext_snuh001` 계정으로 로그인 시 로딩 중 상태에서 멈춤

---

## 증상 상세

### 콘솔 에러 로그
```
OCSNotificationContext.tsx:95 🔌 [OCSNotificationProvider] useEffect 실행: {isAuthenticated: false, user: undefined}
OCSNotificationContext.tsx:98 🔌 [OCSNotificationProvider] 인증 안됨, WebSocket 연결 안함
AppHeader.tsx:69 Uncaught TypeError: Cannot read properties of undefined (reading 'bg')
```

### 사용자 경험
1. 로그인 버튼 클릭 후 로딩 중 상태 지속
2. 화면 전환 없이 멈춤
3. UI 렌더링 에러 발생

---

## 원인 분석

### 1. ROLE_THEME에 EXTERNAL 역할 미정의 (핵심 원인)

**파일**: `brain_tumor_front/src/utils/roleTheme.ts`

```typescript
// 수정 전: EXTERNAL 역할 누락
export const ROLE_THEME = {
  SYSTEMMANAGER: { bg: '...', ... },
  ADMIN: { bg: '...', ... },
  DOCTOR: { bg: '...', ... },
  NURSE: { bg: '...', ... },
  RIS: { bg: '...', ... },
  LIS: { bg: '...', ... },
  PATIENT: { bg: '...', ... },
  // EXTERNAL 역할 없음!
} as const;
```

**발생 메커니즘**:
1. ext_snuh 사용자는 `EXTERNAL` 역할 보유
2. `AppHeader.tsx:40`에서 `ROLE_THEME[user.role.code]` 접근
3. `ROLE_THEME['EXTERNAL']` → `undefined` 반환
4. `AppHeader.tsx:69`에서 `theme.bg` 접근 시 TypeError 발생
5. React 컴포넌트 크래시 → 전체 UI 렌더링 실패

### 2. 로그인 API 응답 처리 미흡

**파일**: `brain_tumor_front/src/pages/auth/LoginPage.tsx`

```typescript
// 수정 전: success 체크 없이 바로 data 접근
const res = await login(id, pw);
localStorage.setItem('accessToken', res.data.access); // res.data가 undefined일 수 있음
```

`login()` 함수는 `{ success: boolean, data?: ..., error?: string }` 형태를 반환하는데,
`res.success` 확인 없이 `res.data`에 바로 접근하여 실패 시 undefined 에러 발생.

### 3. AuthProvider의 fetchMe 실패 처리 미흡

**파일**: `brain_tumor_front/src/pages/auth/AuthProvider.tsx`

```typescript
// 수정 전: API 실패 시 처리 없음
const meRes = await fetchMe();
const meInfo = meRes.data; // meRes.success가 false면 meRes.data는 undefined
```

---

## 해결 방법

### 1. ROLE_THEME에 EXTERNAL 역할 추가

**파일**: `brain_tumor_front/src/utils/roleTheme.ts`

```typescript
// 수정 후
EXTERNAL: {
  bg: 'linear-gradient(90deg, #6b7280, #9ca3af)',
  border: '#6b7280',
  color: '#ffffff',
  icon: 'fa-hospital',
}
```

### 2. LoginPage에서 로그인 실패 처리 추가

**파일**: `brain_tumor_front/src/pages/auth/LoginPage.tsx`

```typescript
// 수정 후
const res = await login(id, pw);

// 로그인 실패 처리
if (!res.success) {
    Swal.fire({
        icon: 'error',
        title: '인증 실패',
        text: res.error || '아이디 또는 비밀번호를 확인해주세요.',
        ...
    });
    return;
}

// 로그인 성공 시에만 토큰 저장
localStorage.setItem('accessToken', res.data.access);
```

### 3. AuthProvider에서 fetchMe 실패 처리 추가

**파일**: `brain_tumor_front/src/pages/auth/AuthProvider.tsx`

```typescript
// 수정 후
const meRes = await fetchMe();
if (!meRes.success) {
  console.error('fetchMe 실패:', meRes.error);
  return null;
}

const meInfo = meRes.data;
// ...

if (menuRes.success) {
  setMenus(menuRes.data.menus);
}
```

---

## 수정된 파일 목록

| 파일 | 수정 내용 |
|------|-----------|
| `src/utils/roleTheme.ts` | EXTERNAL 역할 테마 추가 |
| `src/pages/auth/LoginPage.tsx` | 로그인 실패 시 에러 처리 추가 |
| `src/pages/auth/AuthProvider.tsx` | fetchMe/fetchMenu 실패 처리 추가 |

---

## 테스트 항목

- [ ] `ext_snuh/ext_snuh001` 계정 로그인 성공 확인
- [ ] `ext_amc/ext_amc001` 계정 로그인 성공 확인
- [ ] `ext_smc/ext_smc001` 계정 로그인 성공 확인
- [ ] EXTERNAL 역할 사용자 AppHeader 정상 렌더링 확인
- [ ] 잘못된 비밀번호 입력 시 에러 메시지 표시 확인
- [ ] 기존 역할(ADMIN, DOCTOR 등) 로그인 정상 동작 확인

---

## 향후 개선 권장사항

1. **역할 추가 시 체크리스트**
   - 백엔드 Role 테이블에 추가
   - 프론트엔드 `ROLE_THEME`에 테마 추가
   - 필요시 라우트 권한 설정

2. **방어적 코딩**
   - `ROLE_THEME[role]`이 undefined일 경우 기본 테마 적용
   ```typescript
   const theme = ROLE_THEME[user.role.code as RoleCode] ?? ROLE_THEME.PATIENT;
   ```

3. **API 응답 타입 강화**
   - TypeScript discriminated union 활용하여 success 체크 강제
