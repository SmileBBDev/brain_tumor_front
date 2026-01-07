<h2>프로젝트 소개</h2>

이 프로젝트는 React(Vite) 프론트엔드 + Django 백엔드 구조로 이뤄져 있습니다.

병원용 대시보드 / 권한 기반 메뉴 / 실시간(WebSocket) 기능이 동작하고 있습니다.

<br/>
<br/>

<h2> 🖥️ 프론트엔드 (brain_tumor_front)</h2>
<h3>요약</h3>
  
1.사용자가 보는 화면(UI)

2.로그인 후 역할(Role)에 따라 메뉴/페이지 다르게 표시

3.백엔드 API + WebSocket 연결

<span></span>

<h3>📂 주요 파일/폴더 구조 설명</h3>
<h4>최상위</h4>

index.html : 화면의 뼈대 (React가 붙는 자리)

package.json : 필요한 프로그램 목록

vite.config.ts : 개발 서버 설정

<h4> 폴더 구조 </h4>
src/

-------------------------------------------------------
경로	  &nbsp; &nbsp; | &nbsp; &nbsp;  역할
-------------------------------------------------------
main.tsx		  	    	  &nbsp; &nbsp;    | &nbsp; &nbsp; React 시작 지점 (가장 먼저 실행) <br/>
app/App.tsx		   	    	&nbsp; &nbsp;    | &nbsp; &nbsp; 전체 화면 레이아웃, 로그인 여부 판단 <br/>
app/HomeRedirect.tsx		&nbsp; &nbsp;    | &nbsp; &nbsp; 로그인 후 첫 페이지 이동 로직 <br/>
router/		    	    	  &nbsp; &nbsp;    | &nbsp; &nbsp; 페이지 주소(URL) 관리 <br/>
router/routeMap.tsx		  &nbsp; &nbsp;    | &nbsp; &nbsp; 권한별 접근 가능한 페이지 정의 <br/>
router/AppRoutes.tsx		&nbsp; &nbsp;    | &nbsp; &nbsp; 실제 React Route 설정 <br/>
services/api.ts		    	&nbsp; &nbsp;    | &nbsp; &nbsp; 백엔드 API 호출 함수 모음 <br/>
socket/permissionSocket.ts &nbsp; &nbsp; | &nbsp; &nbsp; 권한 변경 실시간 수신(WebSocket) <br/>
types/menu.ts		    	  &nbsp; &nbsp;    | &nbsp; &nbsp; 메뉴/권한 타입 정의 <br/>
assets/		    	    	  &nbsp; &nbsp;    | &nbsp; &nbsp; 이미지, CSS <br/>


<h4>중요 포인트</h4>
메뉴 하드코딩 ❌ → routeMap.tsx + 서버 데이터 기반

권한 바뀌면 Sidebar 즉시 변경 (WebSocket)

<br/>
<br/>

<h2> 🖥️ 백엔드 (brain_tumor_back)</h2>
<h3>요약</h3>

1. 로그인 / 권한 / 메뉴 데이터 제공

2. WebSocket 서버

3. API 제공



<h3>📂 주요 파일/폴더 구조 설명</h3>
1.manage.py : 서버 실행 버튼 같은 파일

2.config/

-------------------------------------------------------
파일	  &nbsp; &nbsp; | &nbsp; &nbsp;  역할
-------------------------------------------------------
settings.py	 &nbsp; &nbsp;    | &nbsp; &nbsp;  공통 설정 <br/>
dev.py	 &nbsp; &nbsp;    | &nbsp; &nbsp;  개발용 설정 <br/>
prod.py	 &nbsp; &nbsp;    | &nbsp; &nbsp;  배포용 설정 <br/>
urls.py	 &nbsp; &nbsp;    | &nbsp; &nbsp;  API 주소 목록 <br/>
asgi.py  &nbsp; &nbsp;    | &nbsp; &nbsp;  WebSocket 연결 담당 <br/>

3.apps/ : 실제 기능들이 들어있는 곳

-------------------------------------------------------
앱 &nbsp; &nbsp; | &nbsp; &nbsp;  역할
-------------------------------------------------------

accounts	&nbsp; &nbsp;    | &nbsp; &nbsp;  로그인 / 사용자 <br/>
roles	 &nbsp; &nbsp;    | &nbsp; &nbsp;  역할(Role) <br/>
menus	 &nbsp; &nbsp;    | &nbsp; &nbsp;  메뉴 정보 <br/>
permissions	&nbsp; &nbsp;    | &nbsp; &nbsp;  권한 관리 <br/>
patients	&nbsp; &nbsp;    | &nbsp; &nbsp;  환자 관리 <br/>
encounters	&nbsp; &nbsp;    | &nbsp; &nbsp;  진료 관리 <br/>


<br/>
<br/>

<h2> 세팅 방법 </h2>
<h3>1단계: 프로그램 설치</h3>
Node.js 설치 (프론트용)

Python 3.10 이상 설치

<h3>2단계: 프론트 실행</h3>
cd front_code <br/>
npm install <br/>
npm run dev <br/>

* 브라우저에서 http://localhost:5173 접속 -> 로그인 화면 호출됨

<h3>3단계: 백엔드 실행</h3>
cd back_code <br/>
python -m venv venv <br/>
venv\Scripts\activate <br/>
pip install -r requirements.txt <br/>
daphne -b 127.0.0.1 -p 8000 config.asgi:application

* 실행성공 :  http://localhost:8000


<h3>초기 더미데이터 생성</h3>

**SQL 파일 실행**
- 메뉴, 사용자 데이터 생성 가능

**더미 데이터 생성 스크립트**
- 📁 위치: `brain_tumor_back/dummy_data/`
- 📖 자세한 사용법: [dummy_data/README.md](brain_tumor_back/dummy_data/README.md) 참조

**빠른 시작:**
```bash
cd brain_tumor_back

# 1. 환자 데이터 (30명)
python manage.py shell -c "exec(open('dummy_data/create_dummy_patients.py', encoding='utf-8').read())"

# 2. 진료 데이터 (20건)
python manage.py shell -c "exec(open('dummy_data/create_dummy_encounters.py', encoding='utf-8').read())"

# 3. 영상 검사 데이터 (30건 검사, 20건 판독문)
python manage.py shell -c "from dummy_data.create_dummy_imaging import create_dummy_imaging_studies; create_dummy_imaging_studies(30, 20)"
```

<br/>
<br/>

<h2> 📋 주요 기능 </h2>

<h3>1. 환자 관리 (Patient Management)</h3>

**기능**
- 환자 목록 조회 (페이지네이션)
- 환자 상세 정보 조회
- 환자 등록/수정/삭제 (Soft Delete)
- 환자 검색 (이름, 환자번호)

**권한**
- 조회: 모든 역할 (DOCTOR, NURSE, SYSTEMMANAGER)
- 등록/수정: DOCTOR, SYSTEMMANAGER
- 삭제: SYSTEMMANAGER만 가능

**API 엔드포인트**
- `GET /api/patients/` - 환자 목록
- `GET /api/patients/{id}/` - 환자 상세
- `POST /api/patients/` - 환자 등록
- `PUT /api/patients/{id}/` - 환자 수정
- `DELETE /api/patients/{id}/` - 환자 삭제 (Soft Delete)

<h3>2. 진료 관리 (Encounter Management)</h3>

**기능**
- 진료 목록 조회 (페이지네이션, 20건/페이지)
- 진료 상세 정보 조회
- 진료 등록/수정/삭제 (Soft Delete)
- 진료 검색 및 필터링
  - 환자명, 환자번호, 주호소로 검색
  - 진료 유형, 상태, 진료과, 담당의사로 필터링
  - 날짜 범위 검색
- 진료 완료/취소 처리
- 진료 통계 조회

**권한**
- 조회: 모든 역할 (DOCTOR, NURSE, SYSTEMMANAGER)
- 등록/수정: DOCTOR, SYSTEMMANAGER
- 삭제: SYSTEMMANAGER만 가능

**주요 특징**
- 입원중 환자 표시: 퇴원 일시 = 입원 일시면 자동으로 '(입원중)' 표시
- 담당 의사: DOCTOR role 사용자만 선택 가능
- 검색 가능한 Select: 환자/의사 검색 후 선택
- 부 진단명: JSON 배열로 저장, 여러 개 등록 가능

**API 엔드포인트**
- `GET /api/encounters/` - 진료 목록
- `GET /api/encounters/{id}/` - 진료 상세
- `POST /api/encounters/` - 진료 등록
- `PATCH /api/encounters/{id}/` - 진료 수정
- `DELETE /api/encounters/{id}/` - 진료 삭제 (Soft Delete)
- `POST /api/encounters/{id}/complete/` - 진료 완료
- `POST /api/encounters/{id}/cancel/` - 진료 취소
- `GET /api/encounters/statistics/` - 진료 통계

<h3>3. 권한 기반 메뉴 시스템</h3>

**역할(Role)**
- DOCTOR: 의사
- NURSE: 간호사
- SYSTEMMANAGER: 시스템 관리자

**메뉴 구조**
- 대시보드
- 환자 관리 → 환자 목록
- 진료 관리 → 진료 목록
- (추가 예정)

**실시간 권한 업데이트**
- WebSocket을 통한 권한 변경 실시간 반영
- 권한 변경 시 메뉴 자동 업데이트





<br/>
<br/>

<h2> 🔧 개발 현황 </h2>

<h3>✅ 완료된 기능</h3>

1. **인증/권한 시스템**
   - JWT 기반 로그인/로그아웃
   - Role 기반 권한 관리 (DOCTOR, NURSE, SYSTEMMANAGER)
   - 메뉴별 권한 설정
   - WebSocket을 통한 실시간 권한 업데이트

2. **환자 관리**
   - CRUD (Create, Read, Update, Delete - Soft Delete)
   - 페이지네이션 (20건/페이지)
   - 검색 기능 (이름, 환자번호)
   - 권한 기반 접근 제어

3. **진료 관리**
   - CRUD (Create, Read, Update, Delete - Soft Delete)
   - 페이지네이션 (20건/페이지)
   - 고급 검색 및 필터링
   - 진료 완료/취소 처리
   - 진료 통계
   - 입원중 환자 표시
   - 검색 가능한 환자/의사 선택

<h3>🚧 진행중/예정 기능</h3>

1. **사용자 관리**
   - 사용자 목록 페이지네이션 추가 예정

2. **대시보드**
   - 권한별 대시보드 접근 제어 추가 예정
   - 통계 위젯 추가 예정

3. **추가 모듈** (계획중)
   - 처방 관리 (Orders)
   - 진단 검사 (Diagnostics)
   - 영상 관리 (RIS)
   - 임상병리 (LIS)

<br/>
<br/>

<h2> 📝 개발 참고사항 </h2>

<h3>데이터베이스</h3>
- **Soft Delete 패턴 사용**: 실제 삭제 대신 `is_deleted` 플래그 사용
- **Pagination**: 모든 리스트 API는 페이지네이션 적용
- **Timezone-aware DateTime**: Django timezone 사용

<h3>코드 구조</h3>
- **백엔드**: Django REST Framework + ViewSet 패턴
- **프론트엔드**: React + TypeScript + Vite
- **API 통신**: Axios + JWT 인증
- **실시간 통신**: WebSocket (Daphne)

<h3>권한 체크</h3>
- 백엔드: ViewSet의 `perform_create/update/destroy`에서 검증
- 프론트엔드: 메뉴 표시 및 버튼 활성화 제어 

