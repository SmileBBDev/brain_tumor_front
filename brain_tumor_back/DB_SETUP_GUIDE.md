# Brain Tumor CDSS - DB 설정 가이드

## 빠른 시작

```bash
cd brain_tumor_back

# 1단계: 마이그레이션 + 기본 데이터
python setup_database.py

# 2단계: 더미 데이터 (테스트용)
python setup_dummy_data.py
```

## python setup_dummy_data.py --reset
이거 하는게 마음 편하다. 



**끝!** 이제 서버를 실행하세요:

---

## 테스트 계정

| ID | 비밀번호 | 역할 |
|-----|----------|------|
| system | system001 | 시스템 관리자 |
| admin | admin001 | 병원 관리자 |
| doctor1 | doctor001 | 의사 |
| nurse1 | nurse001 | 간호사 |
| patient1 | patient001 | 환자 |
| ris1 | ris001 | 영상과 |
| lis1 | lis001 | 검사과 |

---

## 상세 설명

### setup_database.py
- 마이그레이션 자동 실행 (순서 보장)
- 기본 역할 7개 생성
- 테스트 사용자 7명 생성
- 중복 실행 안전

### setup_dummy_data.py
- 환자 30명
- 진료 20건
- 영상검사 30건 + 판독문 20건
- 중복 실행 안전

**옵션:**
```bash
python setup_dummy_data.py          # 기존 데이터 유지, 부족분만 추가
python setup_dummy_data.py --reset  # 기존 데이터 삭제 후 새로 생성
python setup_dummy_data.py --force  # 목표 수량 이상이어도 강제 추가
```

---

## 선택: SQL 시드 데이터

메뉴/권한을 직접 로드하려면:
```bash
mysql -u root -p brain_tumor < 메뉴-권한\ 매핑\ seed\ 데이터.sql
```

---

## 데이터 초기화

```bash
python manage.py shell
>>> from apps.imaging.models import ImagingStudy
>>> from apps.encounters.models import Encounter
>>> from apps.patients.models import Patient
>>> ImagingStudy.objects.all().delete()
>>> Encounter.objects.all().delete()
>>> Patient.objects.all().delete()
```

---

## 파일 위치

```
brain_tumor_back/
├── setup_database.py     # 1단계: 마이그레이션 + 기본 데이터
└── setup_dummy_data.py   # 2단계: 더미 데이터
```
