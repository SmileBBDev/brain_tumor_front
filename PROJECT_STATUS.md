# 프로젝트 현황 (Project Status)

**최종 업데이트**: 2026-01-07
**현재 버전**: Phase 2 완료

---

## 📊 전체 진행 상황

| 모듈 | 상태 | 완료율 | 비고 |
|------|------|--------|------|
| **인증/권한 시스템** | ✅ 완료 | 100% | JWT, Role 기반, WebSocket 실시간 업데이트 |
| **환자 관리** | ✅ 완료 | 100% | CRUD, 검색, 페이지네이션 |
| **진료 관리** | ✅ 완료 | 100% | CRUD, 고급 필터링, 통계 |
| **영상 관리 (Imaging)** | ✅ Phase 2 완료 | 100% | 오더, 판독, 워크리스트, 히스토리 |
| **검사실 (LIS)** | 📋 계획 | 0% | Coming Soon |
| **처방 (Orders)** | 🚧 부분 구현 | 30% | 목록 페이지만 구현 |
| **AI 요약** | 📋 계획 | 0% | Coming Soon |
| **관리자** | 🚧 부분 구현 | 60% | 사용자/권한/감사로그 일부 구현 |

---

## 🎯 완료된 모듈 상세

### 1. 인증/권한 시스템 ✅
**완료일**: 2025-12-XX
**담당**: 초기 구현

#### 주요 기능
- ✅ JWT 기반 로그인/로그아웃
- ✅ Role 기반 권한 관리 (DOCTOR, NURSE, RIS, LIS, SYSTEMMANAGER, ADMIN)
- ✅ 메뉴별 권한 설정
- ✅ WebSocket을 통한 실시간 권한 업데이트
- ✅ 세션 관리 (30분 타임아웃, 연장 모달)
- ✅ 비밀번호 변경 강제 기능

#### 기술 스택
- **Backend**: Django REST Framework, Simple JWT
- **Frontend**: React Context API, Axios
- **WebSocket**: Django Channels (Daphne)

#### 특이사항
- **2026-01-07**: 권한 체크 로직 비활성화 (`apps/menus/services.py`)
- 현재 모든 사용자가 모든 메뉴에 접근 가능

---

### 2. 환자 관리 (Patient Management) ✅
**완료일**: 2025-12-XX
**담당**: 초기 구현

#### 주요 기능
- ✅ 환자 CRUD (Create, Read, Update, Delete)
- ✅ Soft Delete 패턴
- ✅ 페이지네이션 (20건/페이지)
- ✅ 검색 기능 (이름, 환자번호)
- ✅ 환자 상세 정보 조회

#### API 엔드포인트
- `GET /api/patients/` - 목록
- `GET /api/patients/{id}/` - 상세
- `POST /api/patients/` - 생성
- `PUT /api/patients/{id}/` - 수정
- `DELETE /api/patients/{id}/` - 삭제

#### 더미 데이터
- 스크립트 위치: `dummy_data/create_dummy_patients.py`
- 30명의 환자 데이터 (P2026-0001 ~ P2026-0030)
- 📖 자세한 사용법: [dummy_data/README.md](brain_tumor_back/dummy_data/README.md)

---

### 3. 진료 관리 (Encounter Management) ✅
**완료일**: 2026-01-XX
**담당**: 초기 구현

#### 주요 기능
- ✅ 진료 CRUD
- ✅ Soft Delete 패턴
- ✅ 페이지네이션 (20건/페이지)
- ✅ 고급 검색 및 필터링
  - 환자명, 환자번호, 주호소 검색
  - 진료 유형, 상태, 진료과, 담당의사 필터
  - 날짜 범위 검색
- ✅ 진료 완료/취소 처리
- ✅ 진료 통계 API
- ✅ 입원중 환자 표시
- ✅ 검색 가능한 Select (환자/의사)

#### API 엔드포인트
- `GET /api/encounters/` - 목록
- `GET /api/encounters/{id}/` - 상세
- `POST /api/encounters/` - 생성
- `PATCH /api/encounters/{id}/` - 수정
- `DELETE /api/encounters/{id}/` - 삭제
- `POST /api/encounters/{id}/complete/` - 완료
- `POST /api/encounters/{id}/cancel/` - 취소
- `GET /api/encounters/statistics/` - 통계

#### 더미 데이터
- 스크립트 위치: `dummy_data/create_dummy_encounters.py`
- 20건의 진료 데이터
- 📖 자세한 사용법: [dummy_data/README.md](brain_tumor_back/dummy_data/README.md)

---

### 4. 영상 관리 (Imaging) ✅ Phase 2 완료
**완료일**: 2026-01-07
**담당**: Phase 2 구현

#### Phase 2 주요 기능
- ✅ 영상 검사 오더 관리 (ImagingStudy)
  - 검사 CRUD
  - 검사 상태 관리 (ordered → scheduled → in-progress → completed → reported)
  - 모달리티 지원 (CT, MRI, PET, X-Ray)
- ✅ 판독문 관리 (ImagingReport)
  - 판독문 작성/수정/삭제
  - 판독문 서명
  - 종양 정보 기록 (위치, 크기)
- ✅ RIS 워크리스트
- ✅ 환자별 영상 히스토리 타임라인
- ✅ 판독 상태별 필터링
- ✅ 판독 전용 페이지 (ImagingReportPage)

#### API 엔드포인트
**ImagingStudy**:
- `GET /api/imaging/studies/` - 목록
- `GET /api/imaging/studies/{id}/` - 상세
- `POST /api/imaging/studies/` - 생성
- `PATCH /api/imaging/studies/{id}/` - 수정
- `DELETE /api/imaging/studies/{id}/` - 삭제
- `POST /api/imaging/studies/{id}/complete/` - 검사 완료
- `POST /api/imaging/studies/{id}/cancel/` - 검사 취소
- `GET /api/imaging/studies/worklist/` - RIS 워크리스트
- `GET /api/imaging/studies/patient-history/` - 환자 히스토리

**ImagingReport**:
- `GET /api/imaging/reports/` - 목록
- `GET /api/imaging/reports/{id}/` - 상세
- `POST /api/imaging/reports/` - 생성
- `PATCH /api/imaging/reports/{id}/` - 수정
- `DELETE /api/imaging/reports/{id}/` - 삭제
- `POST /api/imaging/reports/{id}/sign/` - 서명

#### 프론트엔드 페이지
1. **ImagingListPage** (`/imaging/studies`) - 영상 검사 목록
2. **ImagingReportPage** (`/imaging/reports`) - 판독 전용 페이지
3. **ImagingPage** (`/imaging`) - 영상 조회 (미구현)
4. **ImagingWorklistPage** (`/ris/worklist`) - RIS 워크리스트
5. **PatientImagingHistoryPage** (`/imaging/patient-history`) - 환자 히스토리

#### 더미 데이터
- 스크립트 위치: `dummy_data/create_dummy_imaging.py`
- 30개의 영상 검사
- 20개의 판독문
- 📖 자세한 사용법: [dummy_data/README.md](brain_tumor_back/dummy_data/README.md)

#### 향후 계획
- **Phase 3**: 정적 썸네일, Series 모델, 기본 이미지 뷰어
- **Phase 4**: Orthanc PACS, Cornerstone.js DICOM 뷰어
- **Phase 5+**: OHIF Viewer, AI Overlay, 3D

상세: [apps/imaging/README.md](brain_tumor_back/apps/imaging/README.md), [app_확장계획.md](app_확장계획.md)

---

## 🚧 부분 구현된 모듈

### 1. 처방 관리 (Orders)
**진행률**: 30%

#### 완료된 기능
- ✅ 오더 목록 페이지 (OrderListPage)
- ✅ 오더 생성 페이지 (OrderCreatePage)
- ✅ 메뉴 등록

#### 미완성/필요한 기능
- ❌ 백엔드 API 구현
- ❌ 오더 상세 조회
- ❌ 오더 수정/취소
- ❌ 오더 상태 관리

---

### 2. 관리자 (Admin)
**진행률**: 60%

#### 완료된 기능
- ✅ 사용자 목록 (UserList)
- ✅ 사용자 상세 (UserDetailPage)
- ✅ 메뉴 권한 관리 (MenuPermissionPage)
- ✅ 감사 로그 (AuditLog)
- ✅ 시스템 모니터 (SystemMonitorPage)

#### 미완성/필요한 기능
- ❌ 역할 관리 (ADMIN_ROLE) - Coming Soon
- ❌ 사용자 생성/수정 UI 개선
- ❌ 권한 매트릭스 시각화

---

## 📋 계획된 모듈

### 1. 검사실 (LIS - Laboratory Information System)
**상태**: 미구현
**우선순위**: 중

#### 계획된 기능
- 검사 오더 관리
- 검사 결과 업로드
- 검사 결과 조회
- 검사 결과 이력

#### 메뉴 구조 (이미 등록됨)
- LAB (검사)
  - LAB_RESULT_VIEW (검사 결과 조회) - `/lab`
  - LAB_RESULT_UPLOAD (검사 결과 업로드) - `/lab/upload`

---

### 2. AI 요약 (AI Summary)
**상태**: 미구현
**우선순위**: 낮

#### 계획된 기능
- 환자 정보 AI 요약
- 진료 기록 AI 분석
- 영상 판독 AI 보조

---

## 🔧 최근 변경 사항 (Changelog)

### 2026-01-07
#### 영상 관리 모듈 (Imaging)
- ✅ **권한 시스템 비활성화**
  - `apps/menus/services.py`: 모든 활성화된 메뉴 반환
  - 모든 역할이 모든 메뉴에 접근 가능

- ✅ **URL 라우팅 수정**
  - `config/urls.py`: imaging API 경로 추가 (`/api/imaging/`)
  - `config/settings.py`: INSTALLED_APPS에 imaging 추가

- ✅ **판독 페이지 분리**
  - `ImagingReportPage.tsx`: 판독 전용 페이지 신규 생성
  - 영상 목록과 판독 페이지 명확히 구분
  - 완료된 검사만 판독 대상으로 표시

- ✅ **사이드바 메뉴 활성화 수정**
  - `SidebarItem.tsx`: NavLink에 `end` prop 추가
  - 경로 정확히 일치할 때만 active 상태 적용
  - 부모 경로 포함 시 활성화되는 문제 해결

- ✅ **불필요한 파일 정리**
  - 메뉴 등록 스크립트 삭제
  - SQL 파일 삭제
  - 테스트 스크립트 삭제

- ✅ **더미 데이터 스크립트 통합 관리**
  - 모든 더미 데이터 스크립트를 `dummy_data/` 폴더로 통합
  - 파일 이동:
    - `apps/patients/create_dummy_patients.py` → `dummy_data/`
    - `apps/encounters/create_dummy_encounters.py` → `dummy_data/`
    - `apps/imaging/create_dummy_imaging.py` → `dummy_data/`
  - `dummy_data/README.md` 생성: 통합 사용법 문서
  - management/commands 폴더의 중복 스크립트 삭제

- ✅ **README 업데이트**
  - `apps/imaging/README.md`: 더미 데이터 경로 수정
  - `README.md`: 더미 데이터 섹션 통합 안내
  - `PROJECT_STATUS.md`: 더미 데이터 경로 업데이트

---

## 📁 프로젝트 구조

### 백엔드 (brain_tumor_back)
```
brain_tumor_back/
├── config/                           # Django 설정
│   ├── settings.py                   # 공통 설정
│   ├── urls.py                       # URL 라우팅
│   └── asgi.py                       # WebSocket 설정
├── apps/
│   ├── accounts/                     # 사용자 관리
│   ├── authorization/                # 인증/권한
│   ├── menus/                        # 메뉴 관리
│   ├── audit/                        # 감사 로그
│   ├── common/                       # 공통 유틸
│   ├── patients/                     # 환자 관리 ✅
│   ├── encounters/                   # 진료 관리 ✅
│   └── imaging/                      # 영상 관리 ✅
├── dummy_data/                       # 더미 데이터 생성 스크립트
│   ├── create_dummy_patients.py      # 환자 데이터
│   ├── create_dummy_encounters.py    # 진료 데이터
│   ├── create_dummy_imaging.py       # 영상 데이터
│   └── README.md                     # 📖 사용법 문서
└── manage.py
```

### 프론트엔드 (brain_tumor_front)
```
brain_tumor_front/
├── src/
│   ├── pages/
│   │   ├── auth/                     # 로그인/권한
│   │   ├── dashboard/                # 대시보드
│   │   ├── patient/                  # 환자 관리 ✅
│   │   ├── encounter/                # 진료 관리 ✅
│   │   ├── imaging/                  # 영상 관리 ✅
│   │   ├── orders/                   # 처방 (부분)
│   │   ├── ris/                      # RIS (부분)
│   │   ├── admin/                    # 관리자 (부분)
│   │   └── common/                   # 공통 컴포넌트
│   ├── router/                       # 라우팅
│   ├── services/                     # API 호출
│   ├── socket/                       # WebSocket
│   ├── types/                        # TypeScript 타입
│   └── assets/                       # 스타일/이미지
└── vite.config.ts
```

---

## 🔑 주요 기술 스택

### 백엔드
- **Framework**: Django 5.0 + Django REST Framework
- **Database**: MySQL
- **Authentication**: Simple JWT
- **WebSocket**: Django Channels (Daphne)
- **Pagination**: PageNumberPagination (20건/페이지)

### 프론트엔드
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **WebSocket**: Native WebSocket API
- **State Management**: React Context API

### 개발 도구
- **Version Control**: Git
- **Code Editor**: VSCode
- **API Testing**: Django REST Framework Browsable API

---

## 📝 코딩 컨벤션

### 백엔드
- **모델**: PascalCase (예: `ImagingStudy`)
- **Serializer**: PascalCase + Serializer (예: `ImagingStudySerializer`)
- **ViewSet**: PascalCase + ViewSet (예: `ImagingStudyViewSet`)
- **API URL**: kebab-case (예: `/api/imaging/studies/`)
- **Soft Delete**: `is_deleted` 필드 사용

### 프론트엔드
- **컴포넌트**: PascalCase (예: `ImagingListPage`)
- **함수/변수**: camelCase (예: `fetchStudies`)
- **타입**: PascalCase (예: `ImagingStudy`)
- **CSS 클래스**: kebab-case (예: `menu-link`)

---

## 🐛 알려진 이슈

### 현재 이슈
1. **권한 체크 비활성화** (의도적)
   - `apps/menus/services.py`에서 권한 체크 로직 제거됨
   - 모든 사용자가 모든 메뉴 접근 가능
   - 필요시 권한 체크 재활성화 필요

### 해결된 이슈
1. ✅ **영상 목록 404 에러** (2026-01-07 해결)
   - INSTALLED_APPS에 imaging 추가
   - URL 라우팅 등록

2. ✅ **사이드바 메뉴 활성화 중복** (2026-01-07 해결)
   - NavLink에 `end` prop 추가
   - 정확한 경로 매칭

---

## 🚀 다음 할 일 (TODO)

### 단기 (1-2주)
1. [ ] LIS 모듈 기본 구현
   - 검사 오더 관리
   - 검사 결과 업로드/조회

2. [ ] 처방 관리 완성
   - 백엔드 API 구현
   - 오더 상세/수정/취소 기능

3. [ ] README.md 업데이트
   - 영상 관리 모듈 내용 추가
   - 설치 가이드 업데이트

### 중기 (1-2개월)
1. [ ] 영상 관리 Phase 3
   - 정적 썸네일 업로드
   - Series 모델 추가
   - 기본 이미지 뷰어

2. [ ] 권한 시스템 재활성화
   - 메뉴별 권한 체크
   - 역할별 접근 제어

3. [ ] 대시보드 개선
   - 통계 위젯 추가
   - 역할별 맞춤 대시보드

### 장기 (3개월+)
1. [ ] 영상 관리 Phase 4-5
   - Orthanc PACS 연동
   - DICOM 뷰어 (Cornerstone.js)
   - OHIF Viewer 통합

2. [ ] AI 기능 구현
   - 영상 분석 AI
   - 진료 기록 요약 AI

---

## 📞 문의 및 이슈 보고

이슈 발견 시 GitHub Issues에 등록하거나 팀에 문의해주세요.

---

**작성자**: Claude
**최종 업데이트**: 2026-01-07
