# Agent A 작업 지시서 - 백엔드 추가 작업

## 현재 상태
- PatientAlert 모델 및 API 완료
- SOAP 필드 (subjective, objective, assessment, plan) 완료
- examination-summary API 완료
- 마이그레이션 적용 완료

## 추가 작업 없음

A의 ExaminationTab 관련 백엔드 작업이 완료되었습니다.
현재 대기 상태입니다.

---

## 완료된 API 목록 (B 참조용)

### 1. PatientAlert API
```
GET    /api/patients/{patient_id}/alerts/           # 환자 주의사항 목록
POST   /api/patients/{patient_id}/alerts/           # 주의사항 등록
GET    /api/patients/{patient_id}/alerts/{alert_id}/ # 상세 조회
PUT    /api/patients/{patient_id}/alerts/{alert_id}/ # 수정
DELETE /api/patients/{patient_id}/alerts/{alert_id}/ # 삭제
```

### 2. Examination Summary API
```
GET /api/patients/{patient_id}/examination-summary/
```

응답 구조:
```json
{
  "patient": {
    "id": 1,
    "patient_number": "P202600001",
    "name": "홍길동",
    "age": 45,
    "gender": "M",
    "blood_type": "A+",
    "allergies": ["페니실린"],
    "chronic_diseases": ["고혈압"],
    "chief_complaint": "두통"
  },
  "alerts": [
    {
      "id": 1,
      "alert_type": "ALLERGY",
      "severity": "HIGH",
      "title": "페니실린 알레르기",
      "description": "심한 발진 반응",
      "is_active": true
    }
  ],
  "current_encounter": {
    "id": 1,
    "status": "in_progress",
    "subjective": "환자 호소 내용",
    "objective": "검사 소견",
    "assessment": "진단",
    "plan": "치료 계획"
  },
  "recent_encounters": [...],
  "recent_ocs": {
    "ris": [...],
    "lis": [...]
  },
  "ai_summary": {...},
  "generated_at": "2026-01-12T..."
}
```

### 3. Encounter SOAP 저장 API
```
PATCH /api/encounters/{encounter_id}/
```

Body:
```json
{
  "subjective": "환자 호소 내용",
  "objective": "검사 소견",
  "assessment": "진단",
  "plan": "치료 계획"
}
```
