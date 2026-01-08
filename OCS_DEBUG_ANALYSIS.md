# OCS 페이지 데이터 표시 문제 분석

## 문제 현상

| 페이지 | routeMap 키 | 컴포넌트 | 콘솔 로그 | 데이터 표시 |
|--------|-------------|----------|-----------|-------------|
| 검사 오더 | OCS_ORDER | DoctorOrderPage | O | O |
| 오더 목록 | ORDER_LIST | OrderListPage | X | X |
| 영상 워크리스트 | OCS_RIS | RISWorklistPage | X | X |
| 검사 워크리스트 | OCS_LIS | LISWorklistPage | X | X |

## 문제 분석

### 1. "오더 목록" (ORDER_LIST)
- **원인**: `OrderListPage` → `OrderListTable` 컴포넌트가 데이터 fetch 로직이 없음
- **코드 위치**: `src/pages/orders/OrderListTable.tsx`
- **상태**: 항상 "데이터 없음" 표시 (하드코딩됨)
- **결론**: OCS 시스템과 무관한 구 Orders 모듈. 별도 구현 필요.

### 2. "영상 워크리스트" (OCS_RIS) & "검사 워크리스트" (OCS_LIS)
- **현상**: useEffect의 console.log 조차 출력되지 않음
- **의미**: 컴포넌트가 마운트(렌더링)되지 않음
- **추정 원인**:
  1. 해당 메뉴가 DB에서 사용자에게 할당되지 않음
  2. routeMap에서 컴포넌트 매핑이 실패함
  3. 라우터가 해당 경로를 처리하지 못함

## 확인 필요 사항

### DB 확인 (우선순위 높음)
```sql
-- 1. 메뉴가 존재하는지 확인
SELECT * FROM menus_menu WHERE code IN ('OCS_ORDER', 'OCS_RIS', 'OCS_LIS');

-- 2. 권한이 존재하는지 확인
SELECT * FROM accounts_permission WHERE code IN ('OCS_ORDER', 'OCS_RIS', 'OCS_LIS');

-- 3. 역할에 권한이 매핑되어 있는지 확인
SELECT r.code as role_code, p.code as permission_code
FROM accounts_role r
JOIN accounts_role_permissions rp ON r.id = rp.role_id
JOIN accounts_permission p ON p.id = rp.permission_id
WHERE p.code IN ('OCS_ORDER', 'OCS_RIS', 'OCS_LIS');

-- 4. 현재 사용자의 역할 확인
SELECT u.username, r.code as role_code
FROM accounts_user u
JOIN accounts_role r ON u.role_id = r.id
WHERE u.id = [현재_사용자_ID];
```

### 프론트엔드 확인
1. **routeMap.tsx 매핑 확인**
   ```typescript
   // 현재 설정
   OCS_ORDER: DoctorOrderPage,     // 작동함
   OCS_RIS: OCSRISWorklistPage,    // 작동 안함
   OCS_LIS: LISWorklistPage,       // 작동 안함
   ```

2. **import 확인**
   ```typescript
   // routeMap.tsx line 15
   import { DoctorOrderPage, RISWorklistPage as OCSRISWorklistPage, LISWorklistPage } from '@/pages/ocs';
   ```
   - `OCSRISWorklistPage`는 별칭(alias)으로 import됨
   - 실제 컴포넌트는 `@/pages/ocs/RISWorklistPage.tsx`

3. **사이드바 메뉴 렌더링 확인**
   - 사이드바에 "영상 워크리스트", "검사 워크리스트" 메뉴가 보이는지?
   - 메뉴 클릭 시 URL이 변경되는지?

## 설계 원칙 (라우팅, 사이드바 설계규칙.md)

```
menu.code === permission.code === routeMap 키
```

- DB `menus_menu` 테이블의 `code`
- DB `accounts_permission` 테이블의 `code`
- 프론트엔드 `routeMap`의 키

이 세 가지가 모두 일치해야 함.

## 디버깅 단계

### Step 1: 브라우저 DevTools에서 확인
1. 사이드바에서 "영상 워크리스트" 메뉴가 있는지 확인
2. 있다면 클릭 후 Network 탭에서 API 호출 확인
3. Console 탭에서 에러 메시지 확인

### Step 2: React DevTools 확인
1. Components 탭에서 RISWorklistPage 컴포넌트가 렌더링되는지 확인
2. 렌더링되지 않는다면 상위 라우터/레이아웃 컴포넌트 확인

### Step 3: DB 데이터 확인
1. 해당 메뉴가 현재 로그인한 사용자의 역할에 할당되어 있는지 확인

## 예상 원인 (가능성 순)

1. **DB 권한 매핑 누락** (가장 가능성 높음)
   - OCS_RIS, OCS_LIS 권한이 역할에 매핑되지 않음
   - 메뉴가 사이드바에 표시되지 않아 접근 불가

2. **메뉴 데이터 누락**
   - menus_menu 테이블에 OCS_RIS, OCS_LIS 레코드가 없음

3. **import/export 문제**
   - `@/pages/ocs/index.ts`의 export 확인 필요

## 긴급 확인 명령어

Django shell에서 실행:
```python
from apps.accounts.models import Permission, Role
from apps.menus.models import Menu

# 메뉴 확인
print("=== Menus ===")
for m in Menu.objects.filter(code__startswith='OCS'):
    print(f"  {m.code}: {m.name}")

# 권한 확인
print("\n=== Permissions ===")
for p in Permission.objects.filter(code__startswith='OCS'):
    print(f"  {p.code}: {p.name}")

# 역할별 권한 확인
print("\n=== Role Permissions ===")
for role in Role.objects.all():
    perms = role.permissions.filter(code__startswith='OCS').values_list('code', flat=True)
    if perms:
        print(f"  {role.code}: {list(perms)}")
```

## 해결 방안

### DB에 데이터가 없는 경우
```python
# 권한 생성
Permission.objects.get_or_create(code='OCS_RIS', defaults={'name': '영상 워크리스트'})
Permission.objects.get_or_create(code='OCS_LIS', defaults={'name': '검사 워크리스트'})

# 역할에 권한 매핑 (예: RIS 역할에 OCS_RIS 권한)
ris_role = Role.objects.get(code='RIS')
ris_perm = Permission.objects.get(code='OCS_RIS')
ris_role.permissions.add(ris_perm)

# 역할에 권한 매핑 (예: LIS 역할에 OCS_LIS 권한)
lis_role = Role.objects.get(code='LIS')
lis_perm = Permission.objects.get(code='OCS_LIS')
lis_role.permissions.add(lis_perm)
```

### 메뉴 데이터가 없는 경우
```python
from apps.menus.models import Menu

# 부모 메뉴 찾기 (예: OCS 메뉴)
parent = Menu.objects.filter(code='OCS').first()

Menu.objects.get_or_create(
    code='OCS_RIS',
    defaults={
        'name': '영상 워크리스트',
        'parent': parent,
        'order': 2,
        'is_active': True,
    }
)

Menu.objects.get_or_create(
    code='OCS_LIS',
    defaults={
        'name': '검사 워크리스트',
        'parent': parent,
        'order': 3,
        'is_active': True,
    }
)
```
