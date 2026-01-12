# TASK_B: ExaminationTab UI 피드백 개선

## 배경
서버 API는 정상 작동 (200/201 응답 확인됨)하지만, UI에서 저장 성공 여부를 사용자에게 알려주지 않아 "저장이 되는데 UI가 어색한" 문제가 발생함.

---

## 1. SOAP 저장 성공 피드백 추가

### 현재 문제 (108-121줄)
```typescript
const handleSaveSOAP = async () => {
  // ...
  try {
    await updateEncounter(encounterId, soapData);
    onUpdate();
    // ❌ 성공 피드백 없음!
  } catch (err) {
    alert('SOAP 저장에 실패했습니다.');
  }
};
```

### 수정 방안
1. toast 또는 성공 메시지 추가
2. 저장 버튼 텍스트 변경 (저장 완료 → 다시 "SOAP 저장"으로)

### 수정 코드
```typescript
// 상태 추가
const [soapSaved, setSOAPSaved] = useState(false);

const handleSaveSOAP = async () => {
  if (!encounterId) return;

  setSavingSOAP(true);
  setSOAPSaved(false);
  try {
    await updateEncounter(encounterId, soapData);
    onUpdate();
    setSOAPSaved(true);  // ✅ 성공 표시
    // 3초 후 초기화
    setTimeout(() => setSOAPSaved(false), 3000);
  } catch (err) {
    console.error('Failed to save SOAP:', err);
    alert('SOAP 저장에 실패했습니다.');
  } finally {
    setSavingSOAP(false);
  }
};

// 버튼 수정 (264-270줄)
<button
  className={`btn btn-sm ${soapSaved ? 'btn-success' : 'btn-primary'}`}
  onClick={handleSaveSOAP}
  disabled={savingSOAP || !encounterId}
>
  {savingSOAP ? '저장 중...' : soapSaved ? '✓ 저장 완료' : 'SOAP 저장'}
</button>
```

---

## 2. 주호소(Chief Complaint) 수정 기능 추가

### 현재 문제 (250-255줄)
```typescript
{summary.patient.chief_complaint && (
  <div className="info-item full">
    <span className="label">주호소</span>
    <span className="value">{summary.patient.chief_complaint}</span>
    // ❌ 수정 버튼 없음, 읽기 전용
  </div>
)}
```

### 수정 방안
1. 주호소 영역에 수정 버튼 추가
2. 인라인 편집 또는 모달로 수정 가능하게

### 수정 코드
```typescript
// 상태 추가
const [editingChiefComplaint, setEditingChiefComplaint] = useState(false);
const [chiefComplaint, setChiefComplaint] = useState('');
const [savingChiefComplaint, setSavingChiefComplaint] = useState(false);

// summary 로드 시 초기화
useEffect(() => {
  if (summary?.patient?.chief_complaint) {
    setChiefComplaint(summary.patient.chief_complaint);
  }
}, [summary]);

// 저장 함수
const handleSaveChiefComplaint = async () => {
  if (!encounterId) return;
  setSavingChiefComplaint(true);
  try {
    await updateEncounter(encounterId, { chief_complaint: chiefComplaint });
    setEditingChiefComplaint(false);
    loadData(); // 데이터 새로고침
  } catch (err) {
    alert('주호소 저장에 실패했습니다.');
  } finally {
    setSavingChiefComplaint(false);
  }
};

// UI 수정
<div className="info-item full">
  <span className="label">
    주호소
    {encounterId && !editingChiefComplaint && (
      <button
        className="btn-icon-sm"
        onClick={() => setEditingChiefComplaint(true)}
        title="수정"
      >
        ✏️
      </button>
    )}
  </span>
  {editingChiefComplaint ? (
    <div className="chief-complaint-edit">
      <textarea
        value={chiefComplaint}
        onChange={(e) => setChiefComplaint(e.target.value)}
        rows={2}
        placeholder="주호소 입력..."
      />
      <div className="edit-actions">
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setEditingChiefComplaint(false)}
        >
          취소
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={handleSaveChiefComplaint}
          disabled={savingChiefComplaint}
        >
          {savingChiefComplaint ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  ) : (
    <span className="value">{chiefComplaint || summary?.patient?.chief_complaint || '-'}</span>
  )}
</div>
```

---

## 3. Alert 저장 성공 피드백 추가

### 현재 문제 (148-163줄)
```typescript
const handleSaveAlert = async (data: PatientAlertCreateData) => {
  try {
    // 저장 로직...
    setShowAlertModal(false);
    // ❌ 성공 피드백 없음!
  } catch (err) {
    alert('저장에 실패했습니다.');
  }
};
```

### 수정 방안
토스트 메시지 또는 임시 상태로 성공 표시

### 수정 코드
```typescript
// 상태 추가
const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

const handleSaveAlert = async (data: PatientAlertCreateData) => {
  try {
    if (editingAlert) {
      const updated = await updatePatientAlert(patientId, editingAlert.id, data);
      setAlerts((prev) => prev.map((a) => (a.id === editingAlert.id ? updated : a)));
      setAlertMessage({ type: 'success', text: '주의사항이 수정되었습니다.' });
    } else {
      const created = await createPatientAlert(patientId, data);
      setAlerts((prev) => [created, ...prev]);
      setAlertMessage({ type: 'success', text: '주의사항이 추가되었습니다.' });
    }
    setShowAlertModal(false);
    // 3초 후 메시지 제거
    setTimeout(() => setAlertMessage(null), 3000);
  } catch (err) {
    console.error('Failed to save alert:', err);
    setAlertMessage({ type: 'error', text: '저장에 실패했습니다.' });
  }
};

// Alert 삭제 시에도 피드백
const handleDeleteAlert = async (alertId: number) => {
  if (!confirm('이 주의사항을 삭제하시겠습니까?')) return;

  try {
    await deletePatientAlert(patientId, alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setAlertMessage({ type: 'success', text: '주의사항이 삭제되었습니다.' });
    setTimeout(() => setAlertMessage(null), 3000);
  } catch (err) {
    setAlertMessage({ type: 'error', text: '삭제에 실패했습니다.' });
  }
};

// UI에 메시지 표시 (alert-section 내부 상단)
{alertMessage && (
  <div className={`toast-message ${alertMessage.type}`}>
    {alertMessage.text}
  </div>
)}
```

---

## 4. 추가할 CSS

```css
/* Toast/Success Messages */
.toast-message {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 12px;
  animation: fadeIn 0.3s ease;
}
.toast-message.success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}
.toast-message.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Success Button State */
.btn-success {
  background: #4caf50 !important;
  border-color: #4caf50 !important;
  color: white !important;
}

/* Chief Complaint Edit */
.chief-complaint-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.chief-complaint-edit textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 13px;
  resize: vertical;
}
.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Small icon button */
.btn-icon-sm {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 12px;
  opacity: 0.6;
  margin-left: 4px;
}
.btn-icon-sm:hover {
  opacity: 1;
}
```

---

## 5. 백엔드 확인 결과

**chief_complaint 필드 위치**:
- ✅ **Patient 모델**: `apps/patients/models.py:84` - 환자 기본 정보로서의 주호소
- ✅ **Encounter 모델**: `apps/encounters/models.py:75` - 이번 진료의 주호소

**API 동작 방식**:
- `examination-summary`는 `patient.chief_complaint`를 반환 (Patient 모델)
- `updateEncounter`로 저장하면 Encounter의 chief_complaint 변경

**권장 방안**:
진료별 주호소 기록이 중요하므로, Encounter의 chief_complaint 사용 권장.
ExaminationTab에서는 현재 진료(current_encounter)의 chief_complaint를 표시하고 저장.

### 코드 수정 방안 (수정됨)
```typescript
// ExaminationTab.tsx에서 chief_complaint 출처 변경
// 기존: summary.patient.chief_complaint
// 변경: summary.current_encounter?.chief_complaint || summary.patient.chief_complaint

// 이렇게 하면:
// 1. 현재 진료에 주호소가 있으면 그것을 보여줌
// 2. 없으면 환자 기본 주호소를 보여줌
// 3. 수정하면 현재 진료의 주호소가 업데이트됨
```

**UI 수정 코드 (섹션 2 대체)**:
```typescript
// 상태 추가
const [chiefComplaint, setChiefComplaint] = useState('');
const [editingChiefComplaint, setEditingChiefComplaint] = useState(false);
const [savingChiefComplaint, setSavingChiefComplaint] = useState(false);

// loadData 후 초기화 (summary 로드 후)
useEffect(() => {
  if (summary) {
    // 현재 진료의 주호소 우선, 없으면 환자 기본 주호소
    setChiefComplaint(
      summary.current_encounter?.chief_complaint ||
      summary.patient?.chief_complaint ||
      ''
    );
  }
}, [summary]);

// 저장 함수
const handleSaveChiefComplaint = async () => {
  if (!encounterId) return;
  setSavingChiefComplaint(true);
  try {
    await updateEncounter(encounterId, { chief_complaint: chiefComplaint });
    setEditingChiefComplaint(false);
    // 성공 피드백은 SOAP 저장과 동일한 방식으로
  } catch (err) {
    alert('주호소 저장에 실패했습니다.');
  } finally {
    setSavingChiefComplaint(false);
  }
};
```

---

## 체크리스트

- [ ] SOAP 저장 성공 피드백 추가
- [ ] 주호소 수정 기능 추가
- [ ] Alert 추가/수정/삭제 성공 피드백 추가
- [ ] CSS 스타일 추가
- [ ] (A 확인 후) chief_complaint 저장 API 연동

---

**우선순위**: SOAP 저장 피드백 > Alert 피드백 > 주호소 수정
**예상 작업량**: 약 50줄 코드 추가/수정

---

**작성일**: 2025-01-12
**작성자**: C (Coordinator)
