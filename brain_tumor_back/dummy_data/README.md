# 더미 데이터 생성 스크립트

이 폴더는 개발 및 테스트를 위한 더미 데이터 생성 스크립트를 포함합니다.

## 📁 파일 목록

| 파일명 | 설명 | 생성 데이터 |
|--------|------|-------------|
| `create_dummy_patients.py` | 환자 데이터 생성 | 30명의 환자 데이터 |
| `create_dummy_encounters.py` | 진료 데이터 생성 | 20건의 진료 데이터 (외래/입원/응급) |
| `create_dummy_imaging.py` | 영상 검사 및 판독문 생성 | 30건의 검사, 20건의 판독문 |

## 🚀 사용 방법

### 1. 환자 데이터 생성

```bash
cd brain_tumor_back
python manage.py shell -c "exec(open('dummy_data/create_dummy_patients.py', encoding='utf-8').read())"
```

**생성되는 데이터:**
- 30명의 환자
- 환자번호: P2026-0001 ~ P2026-0030
- 다양한 연령대, 성별, 혈액형 포함

**필수 조건:**
- 최소 1명 이상의 사용자(User)가 존재해야 함

---

### 2. 진료 데이터 생성

```bash
cd brain_tumor_back
python manage.py shell -c "exec(open('dummy_data/create_dummy_encounters.py', encoding='utf-8').read())"
```

**생성되는 데이터:**
- 기본 20건의 진료 데이터
- 진료 유형: 외래, 입원, 응급
- 진료 상태: 예약, 진행중, 완료, 취소
- 입원중 환자 포함 (discharge_date NULL)

**필수 조건:**
- 환자 데이터가 먼저 생성되어 있어야 함
- DOCTOR role을 가진 사용자가 최소 1명 이상 존재해야 함

**생성 개수 변경:**
```bash
python manage.py shell
>>> from dummy_data.create_dummy_encounters import create_dummy_encounters
>>> create_dummy_encounters(50)  # 50건 생성
```

---

### 3. 영상 검사 데이터 생성

```bash
cd brain_tumor_back
python manage.py shell
```

```python
>>> from dummy_data.create_dummy_imaging import create_dummy_imaging_studies
>>> create_dummy_imaging_studies(30, 20)  # 검사 30건, 판독문 20건
```

**생성되는 데이터:**
- 영상 검사 데이터 (ImagingStudy)
  - 검사 유형: CT, MRI, X-Ray, Ultrasound, PET
  - 검사 상태: ordered, scheduled, in-progress, completed, reported, cancelled
- 판독문 데이터 (ImagingReport)
  - 판독 소견 (findings)
  - 인상/결론 (impression)
  - 판독 상태: draft, preliminary, final, signed

**필수 조건:**
- 환자 데이터 생성 완료
- 진료 데이터 생성 완료
- DOCTOR 또는 RIS role 사용자 존재

**파라미터:**
- `num_studies`: 생성할 영상 검사 수 (기본값: 30)
- `num_reports`: 생성할 판독문 수 (기본값: 20, 검사 수보다 작아야 함)

---

## 📋 권장 실행 순서

1. **환자 데이터 생성** (`create_dummy_patients.py`)
2. **진료 데이터 생성** (`create_dummy_encounters.py`)
3. **영상 검사 데이터 생성** (`create_dummy_imaging.py`)

이 순서를 따라야 외래키(Foreign Key) 관계가 올바르게 설정됩니다.

## ⚙️ 전체 초기화 스크립트

모든 더미 데이터를 한 번에 생성하려면:

```bash
cd brain_tumor_back

# 1. 환자 데이터 생성
python manage.py shell -c "exec(open('dummy_data/create_dummy_patients.py', encoding='utf-8').read())"

# 2. 진료 데이터 생성
python manage.py shell -c "exec(open('dummy_data/create_dummy_encounters.py', encoding='utf-8').read())"

# 3. 영상 검사 데이터 생성
python manage.py shell -c "from dummy_data.create_dummy_imaging import create_dummy_imaging_studies; create_dummy_imaging_studies(30, 20)"
```

## 🔄 데이터 삭제 (초기화)

더미 데이터를 삭제하고 다시 생성하려면:

```bash
cd brain_tumor_back
python manage.py shell
```

```python
from apps.patients.models import Patient
from apps.encounters.models import Encounter
from apps.imaging.models import ImagingStudy, ImagingReport

# 모든 더미 데이터 삭제 (주의: 실제 데이터도 삭제됨)
ImagingReport.objects.all().delete()
ImagingStudy.objects.all().delete()
Encounter.objects.all().delete()
Patient.objects.all().delete()
```

## ⚠️ 주의사항

- **개발 환경에서만 사용**: 이 스크립트는 개발/테스트 환경에서만 실행하세요.
- **운영 환경 금지**: 절대 운영(production) 환경에서 실행하지 마세요.
- **데이터 백업**: 기존 데이터가 있다면 백업 후 실행하세요.
- **의존성 확인**: 각 스크립트는 선행 데이터가 필요합니다 (위의 실행 순서 참조).

## 🐛 트러블슈팅

### "No active patients found"
→ `create_dummy_patients.py`를 먼저 실행하세요.

### "No doctors found"
→ DOCTOR role을 가진 사용자를 먼저 생성하세요.

### "관계형 제약 조건 위반"
→ 권장 실행 순서를 따라 환자 → 진료 → 영상 순으로 생성하세요.

### "ModuleNotFoundError"
→ `brain_tumor_back` 디렉토리에서 실행했는지 확인하세요.
