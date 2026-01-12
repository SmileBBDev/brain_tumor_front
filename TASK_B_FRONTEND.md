# Agent B 작업 지시서 - ExaminationTab 프론트엔드 구현

## 목표
ClinicPage에 ExaminationTab (진찰 탭) 컴포넌트를 추가하여 환자 진찰 정보를 표시

## 사전 조건
- A의 백엔드 작업 완료 (PatientAlert, SOAP, examination-summary API)
- 마이그레이션 적용 완료

---

## 작업 목록

### 1. 타입 정의 추가

#### 파일: `src/types/patient.ts` (수정)
```typescript
// PatientAlert 타입 추가
export type AlertType = 'ALLERGY' | 'CONTRAINDICATION' | 'PRECAUTION' | 'OTHER';
export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PatientAlert {
  id: number;
  patient: number;
  alert_type: AlertType;
  alert_type_display?: string;
  severity: AlertSeverity;
  severity_display?: string;
  title: string;
  description: string;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface ExaminationSummary {
  patient: {
    id: number;
    patient_number: string;
    name: string;
    age: number;
    gender: string;
    blood_type: string | null;
    allergies: string[];
    chronic_diseases: string[];
    chief_complaint: string;
  };
  alerts: PatientAlert[];
  current_encounter: Encounter | null;
  recent_encounters: Encounter[];
  recent_ocs: {
    ris: OCSListItem[];
    lis: OCSListItem[];
  };
  ai_summary: {
    id: number;
    created_at: string;
    result: any;
  } | null;
  generated_at: string;
}
```

---

### 2. API 서비스 추가

#### 파일: `src/services/patient.api.ts` (수정)
```typescript
// PatientAlert API 추가
export const getPatientAlerts = async (patientId: number): Promise<PatientAlert[]> => {
  const response = await api.get(`/api/patients/${patientId}/alerts/`);
  return response.data;
};

export const createPatientAlert = async (
  patientId: number,
  data: Omit<PatientAlert, 'id' | 'patient' | 'created_at' | 'updated_at'>
): Promise<PatientAlert> => {
  const response = await api.post(`/api/patients/${patientId}/alerts/`, data);
  return response.data;
};

export const updatePatientAlert = async (
  patientId: number,
  alertId: number,
  data: Partial<PatientAlert>
): Promise<PatientAlert> => {
  const response = await api.put(`/api/patients/${patientId}/alerts/${alertId}/`, data);
  return response.data;
};

export const deletePatientAlert = async (patientId: number, alertId: number): Promise<void> => {
  await api.delete(`/api/patients/${patientId}/alerts/${alertId}/`);
};

// Examination Summary API 추가
export const getExaminationSummary = async (patientId: number): Promise<ExaminationSummary> => {
  const response = await api.get(`/api/patients/${patientId}/examination-summary/`);
  return response.data;
};
```

---

### 3. ExaminationTab 컴포넌트 생성

#### 파일: `src/pages/clinic/components/ExaminationTab.tsx` (신규)

컴포넌트 구조:
```
ExaminationTab
├── PatientAlertSection (환자 주의사항)
│   ├── Alert 목록 (심각도별 색상)
│   └── Alert 추가/수정 모달
├── PatientInfoSection (환자 기본정보)
│   ├── 혈액형, 알레르기, 기저질환
│   └── 주호소
├── SOAPSection (SOAP 노트)
│   ├── Subjective (주관적 소견)
│   ├── Objective (객관적 소견)
│   ├── Assessment (평가)
│   └── Plan (계획)
├── RecentHistorySection (최근 이력)
│   ├── 최근 진료 (5건)
│   └── 최근 검사 (RIS/LIS)
└── AISummarySection (AI 요약) - optional
```

#### Props:
```typescript
interface ExaminationTabProps {
  patientId: number;
  encounterId: number | null;
  onUpdate: () => void;
}
```

---

### 4. ClinicPage 수정

#### 파일: `src/pages/clinic/ClinicPage.tsx` (수정)

1. 탭 시스템 추가:
```typescript
const [activeTab, setActiveTab] = useState<'examination' | 'orders' | 'history'>('examination');
```

2. 탭 네비게이션 UI:
```tsx
<div className="clinic-tabs">
  <button
    className={`tab ${activeTab === 'examination' ? 'active' : ''}`}
    onClick={() => setActiveTab('examination')}
  >
    진찰
  </button>
  <button
    className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
    onClick={() => setActiveTab('orders')}
  >
    오더
  </button>
  <button
    className={`tab ${activeTab === 'history' ? 'active' : ''}`}
    onClick={() => setActiveTab('history')}
  >
    과거 기록
  </button>
</div>
```

3. 탭 컨텐츠:
```tsx
{activeTab === 'examination' && (
  <ExaminationTab
    patientId={patient.id}
    encounterId={activeEncounter?.id || null}
    onUpdate={loadPatientData}
  />
)}
{activeTab === 'orders' && (
  // 기존 OrderCard 등
)}
{activeTab === 'history' && (
  // 기존 PastRecordCard 등
)}
```

---

### 5. SOAP 섹션 상세 구현

```tsx
// SOAPSection.tsx
interface SOAPSectionProps {
  encounter: Encounter | null;
  onSave: (data: SOAPData) => Promise<void>;
}

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const SOAPSection: React.FC<SOAPSectionProps> = ({ encounter, onSave }) => {
  const [formData, setFormData] = useState<SOAPData>({
    subjective: encounter?.subjective || '',
    objective: encounter?.objective || '',
    assessment: encounter?.assessment || '',
    plan: encounter?.plan || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      toast.success('SOAP 저장 완료');
    } catch (err) {
      toast.error('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="soap-section">
      <div className="soap-field">
        <label>S - Subjective (주관적 소견)</label>
        <textarea
          value={formData.subjective}
          onChange={(e) => setFormData({ ...formData, subjective: e.target.value })}
          placeholder="환자가 호소하는 증상..."
        />
      </div>
      <div className="soap-field">
        <label>O - Objective (객관적 소견)</label>
        <textarea
          value={formData.objective}
          onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
          placeholder="검사 결과, 관찰 소견..."
        />
      </div>
      <div className="soap-field">
        <label>A - Assessment (평가)</label>
        <textarea
          value={formData.assessment}
          onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
          placeholder="진단, 감별진단..."
        />
      </div>
      <div className="soap-field">
        <label>P - Plan (계획)</label>
        <textarea
          value={formData.plan}
          onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
          placeholder="치료 계획, 처방..."
        />
      </div>
      <button onClick={handleSave} disabled={saving || !encounter}>
        {saving ? '저장 중...' : 'SOAP 저장'}
      </button>
    </div>
  );
};
```

---

### 6. PatientAlertSection 상세 구현

```tsx
// PatientAlertSection.tsx

const SEVERITY_COLORS = {
  HIGH: '#d32f2f',    // 빨강
  MEDIUM: '#f57c00',  // 주황
  LOW: '#1976d2',     // 파랑
};

const ALERT_TYPE_ICONS = {
  ALLERGY: '⚠️',
  CONTRAINDICATION: '🚫',
  PRECAUTION: '⚡',
  OTHER: 'ℹ️',
};

interface PatientAlertSectionProps {
  patientId: number;
  alerts: PatientAlert[];
  onRefresh: () => void;
}

const PatientAlertSection: React.FC<PatientAlertSectionProps> = ({
  patientId,
  alerts,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="alert-section">
      <div className="section-header">
        <h4>환자 주의사항</h4>
        <button onClick={() => setShowAddModal(true)}>+ 추가</button>
      </div>

      {alerts.length === 0 ? (
        <div className="empty">등록된 주의사항이 없습니다.</div>
      ) : (
        <div className="alert-list">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="alert-item"
              style={{ borderLeft: `4px solid ${SEVERITY_COLORS[alert.severity]}` }}
            >
              <span className="alert-icon">{ALERT_TYPE_ICONS[alert.alert_type]}</span>
              <div className="alert-content">
                <div className="alert-title">{alert.title}</div>
                <div className="alert-desc">{alert.description}</div>
              </div>
              <span className={`severity-badge ${alert.severity.toLowerCase()}`}>
                {alert.severity}
              </span>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AlertAddModal
          patientId={patientId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
```

---

## 스타일 가이드

### 색상
- 심각도 HIGH: `#d32f2f` (빨강)
- 심각도 MEDIUM: `#f57c00` (주황)
- 심각도 LOW: `#1976d2` (파랑)
- 배경: `var(--bg-primary)`, `var(--bg-secondary)`
- 텍스트: `var(--text-primary)`, `var(--text-secondary)`

### 레이아웃
- SOAP 섹션: 각 필드 세로 배치, textarea 높이 80px
- Alert 섹션: 카드 형태, 왼쪽 색상 바
- 전체 패딩: 16px

---

## 테스트 체크리스트

- [ ] examination-summary API 호출 확인
- [ ] SOAP 데이터 로드 및 저장
- [ ] PatientAlert 목록 표시
- [ ] PatientAlert 추가/수정/삭제
- [ ] 탭 전환 시 데이터 유지
- [ ] 진료 시작 전/후 상태 분기 처리

---

## 참고 파일
- 기존 카드 스타일: `src/pages/clinic/components/TodaySymptomCard.tsx`
- 타입 참고: `src/types/encounter.ts`, `src/types/ocs.ts`
- API 참고: `src/services/encounter.api.ts`
