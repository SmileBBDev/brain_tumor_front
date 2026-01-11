# NeuroNova CDSS - 네비게이션 & 라우팅 구조 가이드

## 목차
1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [메뉴 구조](#메뉴-구조)
4. [라우트 매핑](#라우트-매핑)
5. [권한 시스템](#권한-시스템)
6. [역할별 접근 권한](#역할별-접근-권한)

---

## 개요

NeuroNova CDSS는 **DB 기반 동적 메뉴 시스템**을 사용합니다. 메뉴, 권한, 역할별 접근 권한이 모두 데이터베이스에서 관리되며, 프론트엔드는 로그인 시 사용자 역할에 맞는 메뉴와 권한을 API로 받아와 동적으로 네비게이션을 렌더링합니다.

### 핵심 특징
- **RBAC (Role-Based Access Control)**: 역할 기반 접근 제어
- **동적 메뉴**: DB에서 메뉴 구조를 로드하여 사이드바 렌더링
- **권한 기반 라우팅**: 접근 권한이 있는 메뉴만 라우트 등록
- **다국어 라벨 지원**: 역할별로 다른 메뉴 라벨 표시 가능

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │  AuthProvider │──▶│   Sidebar   │──▶│   SidebarItem      │ │
│  │  (menus,      │    │  (네비게이션) │    │   (메뉴 아이템)    │ │
│  │   permissions)│    └─────────────┘    └─────────────────────┘ │
│  └───────┬───────┘                                               │
│          │                                                       │
│          ▼                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │  AppRoutes   │──▶│  routeMap   │──▶│   Page Components   │ │
│  │  (라우트 생성) │    │  (코드↔컴포넌트)│    │   (실제 화면)      │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ API 호출 (로그인 시)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (Django)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │    Menu     │◀──▶│ MenuPermission│◀──▶│    Permission      │ │
│  │  (메뉴 구조)  │    │  (메뉴-권한)  │    │   (권한 정의)      │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                                        ▲              │
│         ▼                                        │              │
│  ┌─────────────┐                        ┌─────────────────────┐ │
│  │  MenuLabel  │                        │   Role.permissions  │ │
│  │  (역할별 라벨) │                        │   (역할별 권한)      │ │
│  └─────────────┘                        └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 메뉴 구조

### 전체 메뉴 트리

```
📁 ROOT
├── 📊 DASHBOARD                    /dashboard              모든 역할
│
├── 📁 PATIENT (그룹)
│   ├── 👥 PATIENT_LIST             /patients               환자 목록
│   ├── 👤 PATIENT_DETAIL           /patients/:patientId    환자 상세 (breadcrumb only)
│   └── 🏥 PATIENT_CARE             /patients/care          환자 진료 (Clinic)
│
├── 📁 ORDER (그룹: 검사 오더)
│   ├── 📋 ORDER_LIST               /orders/list            오더 목록 (전체 조회)
│   ├── ➕ ORDER_CREATE             /orders/create          오더 생성 (breadcrumb only)
│   └── 📝 OCS_ORDER                /ocs/order              내 검사 오더 (의사용)
│
├── 📁 IMAGING (그룹: 영상)
│   ├── 🖼️ IMAGE_VIEWER             /imaging                영상 조회
│   ├── 📋 RIS_WORKLIST             /ris/worklist           판독 Worklist (비활성화)
│   ├── 🔬 OCS_RIS                  /ocs/ris                영상 워크리스트
│   │   └── 🔍 OCS_RIS_DETAIL       /ocs/ris/:ocsId         영상 검사 상세 (breadcrumb only)
│   ├── 📊 RIS_DASHBOARD            /ocs/ris/dashboard      영상 판독 현황
│   └── ⬆️ RIS_RESULT_UPLOAD        /ris/upload             영상 결과 업로드 (breadcrumb only)
│
├── 📁 LAB (그룹: 검사)
│   ├── 📖 LAB_RESULT_VIEW          /lab                    검사 조회
│   ├── ⬆️ LAB_RESULT_UPLOAD        /lab/upload             검사 결과 업로드 (breadcrumb only)
│   ├── 🧪 OCS_LIS                  /ocs/lis                검사 워크리스트
│   │   └── 🔍 OCS_LIS_DETAIL       /ocs/lis/:ocsId         검사 결과 상세 (breadcrumb only)
│   └── 📈 LIS_PROCESS_STATUS       /ocs/lis/process-status 결과 처리 상태
│
├── 🧠 AI_SUMMARY                   /ai                     AI 분석 요약
│
├── 📋 NURSE_RECEPTION              /nurse/reception        진료 접수 현황
│
└── 📁 ADMIN (그룹: 관리자)
    ├── 👥 ADMIN_USER               /admin/users            사용자 관리
    │   └── 👤 ADMIN_USER_DETAIL    /admin/users/:id        사용자 상세 (breadcrumb only)
    ├── 🔐 ADMIN_ROLE               /admin/roles            역할 권한 관리
    ├── 📜 ADMIN_MENU_PERMISSION    /admin/permissions      메뉴 권한 관리
    ├── 📝 ADMIN_AUDIT_LOG          /admin/audit            접근 감사 로그
    └── 🖥️ ADMIN_SYSTEM_MONITOR     /admin/monitor          시스템 모니터링
```

### breadcrumb_only 메뉴

사이드바에는 표시되지 않지만, 라우트로 등록되어 브레드크럼에서만 표시되는 메뉴입니다:

| 메뉴 코드 | 경로 | 설명 |
|-----------|------|------|
| `PATIENT_DETAIL` | `/patients/:patientId` | 환자 상세 페이지 |
| `ORDER_CREATE` | `/orders/create` | 오더 생성 페이지 |
| `OCS_RIS_DETAIL` | `/ocs/ris/:ocsId` | 영상 검사 상세 |
| `OCS_LIS_DETAIL` | `/ocs/lis/:ocsId` | 검사 결과 상세 |
| `RIS_RESULT_UPLOAD` | `/ris/upload` | 영상 결과 업로드 |
| `LAB_RESULT_UPLOAD` | `/lab/upload` | 검사 결과 업로드 |
| `ADMIN_USER_DETAIL` | `/admin/users/:id` | 사용자 상세 |

---

## 라우트 매핑

### routeMap.tsx - 메뉴 코드 ↔ React 컴포넌트 매핑

```typescript
// src/router/routeMap.tsx

export const routeMap: Record<string, ComponentType> = {
  // === DASHBOARD ===
  DASHBOARD: DashboardPage,

  // === PATIENT 그룹 ===
  PATIENT_LIST: PatientListPage,
  PATIENT_DETAIL: PatientDetailPage,
  PATIENT_CARE: ClinicPage,

  // === ORDER 그룹 ===
  ORDER_LIST: OrderListPage,
  ORDER_CREATE: OrderCreatePage,
  OCS_ORDER: DoctorOrderPage,

  // === IMAGING 그룹 ===
  IMAGE_VIEWER: ImagingListPage,
  RIS_WORKLIST: RISWorklistPage,
  OCS_RIS: OCSRISWorklistPage,
  OCS_RIS_DETAIL: RISStudyDetailPage,
  RIS_DASHBOARD: RISDashboardPage,
  RIS_RESULT_UPLOAD: RISUploadPage,

  // === LAB 그룹 ===
  LAB_RESULT_VIEW: LabListPage,
  LAB_RESULT_UPLOAD: LISUploadPage,
  OCS_LIS: LISWorklistPage,
  OCS_LIS_DETAIL: LISStudyDetailPage,
  LIS_PROCESS_STATUS: LISProcessStatusPage,

  // === AI ===
  AI_SUMMARY: AISummaryPage,

  // === NURSE ===
  NURSE_RECEPTION: NurseReceptionPage,

  // === ADMIN 그룹 ===
  ADMIN_USER: UserList,
  ADMIN_USER_DETAIL: UserDetailPage,
  ADMIN_ROLE: RoleControlPage,
  ADMIN_MENU_PERMISSION: MenuPermissionPage,
  ADMIN_AUDIT_LOG: AuditLog,
  ADMIN_SYSTEM_MONITOR: SystemMonitorPage,
};
```

### AppRoutes.tsx - 동적 라우트 생성

```typescript
// src/router/AppRoutes.tsx

export default function AppRoutes() {
  const { menus, permissions } = useAuth();

  // 접근 가능한 메뉴 추출 (breadcrumbOnly 포함)
  const accessibleMenus = flattenAccessibleMenus(menus, permissions, true);

  return (
    <Routes>
      {/* 홈 - 첫 접근 가능한 페이지로 리다이렉트 */}
      <Route index element={<Navigate to={homePath} replace />} />

      {/* 메뉴 외 직접 접근 필요 라우트 */}
      <Route path="/orders/create" element={<OrderCreatePage />} />
      <Route path="/ocs/report/:ocsId" element={<OCSResultReportPage />} />

      {/* DB 메뉴 기반 동적 라우트 */}
      {accessibleMenus.map(menu => {
        const Component = routeMap[menu.code];
        if (!Component) return null;
        return (
          <Route
            key={menu.code}
            path={menu.path}
            element={<ProtectedRoute><Component /></ProtectedRoute>}
          />
        );
      })}

      {/* 404/403 처리 */}
      <Route path="*" element={<Navigate to="/403" replace />} />
    </Routes>
  );
}
```

---

## 권한 시스템

### 권한 목록 (Permission)

| 코드 | 설명 |
|------|------|
| `DASHBOARD` | 대시보드 화면 접근 |
| `PATIENT` | 환자 메뉴 |
| `PATIENT_LIST` | 환자 목록 화면 |
| `PATIENT_DETAIL` | 환자 상세 화면 |
| `PATIENT_CARE` | 환자 진료 화면 접근 |
| `ORDER` | 검사 오더 메뉴 |
| `ORDER_LIST` | 검사 오더 목록 화면 |
| `ORDER_CREATE` | 검사 오더 생성 화면 |
| `OCS_ORDER` | 의사용 검사 오더 생성/관리 |
| `OCS_RIS` | RIS 작업자용 영상 오더 처리 |
| `OCS_RIS_DETAIL` | RIS 영상 검사 상세 페이지 |
| `RIS_DASHBOARD` | RIS 전체 판독 현황 대시보드 |
| `RIS_RESULT_UPLOAD` | 외부 영상 결과 업로드 화면 |
| `OCS_LIS` | LIS 작업자용 검사 오더 처리 |
| `OCS_LIS_DETAIL` | LIS 검사 결과 상세 페이지 |
| `LIS_PROCESS_STATUS` | LIS 업로드 데이터 처리 상태 모니터링 |
| `NURSE_RECEPTION` | 간호사용 진료 접수 현황 페이지 |
| `IMAGING` | 영상 메뉴 |
| `IMAGE_VIEWER` | 영상 조회 화면 |
| `RIS_WORKLIST` | RIS 판독 Worklist 화면 |
| `LAB` | 검사 메뉴 |
| `LAB_RESULT_VIEW` | 검사 결과 조회 화면 |
| `LAB_RESULT_UPLOAD` | 검사 결과 업로드 화면 |
| `AI_SUMMARY` | AI 분석 요약 화면 |
| `ADMIN` | 관리자 메뉴 |
| `ADMIN_USER` | 사용자 관리 화면 |
| `ADMIN_USER_DETAIL` | 사용자 상세 화면 |
| `ADMIN_ROLE` | 역할 관리 화면 |
| `ADMIN_MENU_PERMISSION` | 메뉴 권한 관리 화면 |
| `ADMIN_AUDIT_LOG` | 접근 감사 로그 화면 |
| `ADMIN_SYSTEM_MONITOR` | 시스템 모니터링 화면 |

---

## 역할별 접근 권한

### 역할 목록

| 역할 코드 | 역할명 | 설명 |
|-----------|--------|------|
| `SYSTEMMANAGER` | System Manager | 시스템 관리자 (모든 권한) |
| `ADMIN` | Admin | 병원 관리자 |
| `DOCTOR` | Doctor | 의사 |
| `NURSE` | Nurse | 간호사 |
| `RIS` | RIS | 영상의학과 |
| `LIS` | LIS | 검사실 |
| `PATIENT` | Patient | 환자 |

### 역할별 메뉴 접근 권한

#### SYSTEMMANAGER (시스템 관리자)
- **모든 메뉴에 접근 가능**

#### ADMIN (병원 관리자)
```
✅ DASHBOARD, PATIENT, PATIENT_LIST, PATIENT_DETAIL, PATIENT_CARE
✅ ORDER, ORDER_LIST, ORDER_CREATE, OCS_ORDER
✅ OCS_RIS, OCS_RIS_DETAIL, OCS_LIS, OCS_LIS_DETAIL
✅ IMAGING, IMAGE_VIEWER, RIS_WORKLIST
✅ LAB, LAB_RESULT_VIEW, LAB_RESULT_UPLOAD
✅ AI_SUMMARY, NURSE_RECEPTION
✅ ADMIN, ADMIN_USER, ADMIN_USER_DETAIL, ADMIN_ROLE, ADMIN_MENU_PERMISSION, ADMIN_AUDIT_LOG
```

#### DOCTOR (의사)
```
✅ DASHBOARD
✅ PATIENT_LIST, PATIENT_DETAIL, PATIENT_CARE
✅ ORDER_LIST, OCS_ORDER
✅ IMAGE_VIEWER, RIS_WORKLIST
✅ LAB_RESULT_VIEW
✅ AI_SUMMARY
```

#### NURSE (간호사)
```
✅ DASHBOARD
✅ PATIENT_LIST, PATIENT_DETAIL, PATIENT_CARE
✅ ORDER_LIST
✅ IMAGE_VIEWER
✅ LAB_RESULT_VIEW
✅ NURSE_RECEPTION
```

#### RIS (영상의학과)
```
✅ DASHBOARD
✅ IMAGE_VIEWER, RIS_WORKLIST
✅ OCS_RIS, OCS_RIS_DETAIL
✅ RIS_DASHBOARD, RIS_RESULT_UPLOAD
```

#### LIS (검사실)
```
✅ DASHBOARD
✅ LAB_RESULT_VIEW, LAB_RESULT_UPLOAD
✅ OCS_LIS, OCS_LIS_DETAIL
✅ LIS_PROCESS_STATUS
```

---

## 파일 구조

### Frontend

```
src/
├── router/
│   ├── AppRoutes.tsx          # 동적 라우트 생성
│   └── routeMap.tsx           # 메뉴 코드 ↔ 컴포넌트 매핑
│
├── layout/
│   ├── Sidebar.tsx            # 사이드바 네비게이션
│   └── SidebarItem.tsx        # 개별 메뉴 아이템
│
├── pages/
│   ├── auth/
│   │   ├── AuthProvider.tsx   # 인증 상태, 메뉴, 권한 관리
│   │   └── ProtectedRoute.tsx # 보호된 라우트 래퍼
│   │
│   ├── dashboard/             # 대시보드 페이지
│   ├── patient/               # 환자 관련 페이지
│   ├── encounter/             # 진료 관련 페이지
│   ├── orders/                # 오더 관련 페이지
│   ├── ocs/                   # OCS 관련 페이지
│   ├── imaging/               # 영상 관련 페이지
│   ├── lab/                   # 검사 관련 페이지
│   ├── nurse/                 # 간호사 전용 페이지
│   ├── ai-inference/          # AI 추론 관련 페이지
│   ├── clinic/                # 진료실 페이지
│   └── admin/                 # 관리자 페이지
│
└── types/
    └── menu.ts                # MenuNode 타입 정의
```

### Backend

```
apps/
├── menus/
│   ├── models.py              # Menu, MenuLabel, MenuPermission 모델
│   ├── views.py               # 메뉴 API
│   └── serializers.py         # 메뉴 직렬화
│
├── accounts/
│   ├── models/
│   │   ├── role.py            # Role 모델
│   │   ├── permission.py      # Permission 모델
│   │   └── user.py            # User 모델
│   └── views.py               # 인증/사용자 API
│
└── setup_dummy_data/
    └── setup_dummy_data_1_base.py  # 메뉴/권한 시드 데이터
```

---

## 새 메뉴 추가 방법

### 1. Backend - 시드 데이터 추가

`setup_dummy_data/setup_dummy_data_1_base.py` 수정:

```python
# 1. 권한 추가
permissions_data = [
    # ...
    ('NEW_MENU', '새 메뉴', '새 메뉴 설명'),
]

# 2. 메뉴 추가
create_menu(33, code='NEW_MENU', path='/new-path', icon='icon-name', order=10, is_active=True, parent=parent_menu)

# 3. 메뉴 라벨 추가
menu_labels_data = [
    # ...
    (33, 'DEFAULT', '새 메뉴'),
]

# 4. 역할별 권한 매핑
role_permissions = {
    'DOCTOR': [..., 'NEW_MENU'],
    # ...
}
```

### 2. Frontend - 라우트 매핑 추가

`src/router/routeMap.tsx` 수정:

```typescript
import NewPage from '@/pages/new/NewPage';

export const routeMap: Record<string, ComponentType> = {
  // ...
  NEW_MENU: NewPage,
};
```

### 3. 시드 데이터 재실행

```bash
cd brain_tumor_back
python -m setup_dummy_data --menu
```

---

## 주의사항

1. **메뉴 코드 일관성**: Backend의 메뉴 `code`와 Frontend의 `routeMap` 키가 정확히 일치해야 합니다.

2. **breadcrumb_only 메뉴**: 사이드바에 표시되지 않지만 라우트는 등록됩니다. 상세 페이지나 생성 페이지에 사용합니다.

3. **권한 상속**: 메뉴 그룹(예: `PATIENT`)에 권한이 있어도 하위 메뉴(예: `PATIENT_LIST`)에 별도 권한이 필요합니다.

4. **동적 라우트 파라미터**: `:patientId`, `:ocsId` 등의 파라미터는 React Router의 `useParams` 훅으로 접근합니다.

5. **홈 리다이렉트**: 로그인 후 사용자의 첫 번째 접근 가능한 메뉴로 자동 리다이렉트됩니다.
