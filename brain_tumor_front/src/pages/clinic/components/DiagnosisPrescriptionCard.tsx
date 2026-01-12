/**
 * 처방 카드
 * - 약 처방 생성 및 발행
 * - 진단은 SOAP Assessment에서 입력
 */
import { useState, useEffect } from 'react';
import {
  createPrescription,
  issuePrescription,
  getPrescriptionsByPatient,
} from '@/services/prescription.api';
import type { Encounter } from '@/types/encounter';
import type {
  PrescriptionListItem,
  PrescriptionItemCreateData,
  PrescriptionFrequency,
  PrescriptionRoute,
} from '@/types/prescription';
import { FREQUENCY_LABELS, ROUTE_LABELS } from '@/types/prescription';

interface PrescriptionCardProps {
  patientId: number;
  encounter: Encounter | null;
  onPrescriptionCreated?: () => void;
}

// 기본 처방 항목
const DEFAULT_ITEM: PrescriptionItemCreateData = {
  medication_name: '',
  dosage: '',
  frequency: 'TID',
  route: 'PO',
  duration_days: 7,
  quantity: 21,
  instructions: '',
};

export default function PrescriptionCard({
  patientId,
  encounter,
  onPrescriptionCreated,
}: PrescriptionCardProps) {
  // 처방 관련 상태
  const [prescriptionDiagnosis, setPrescriptionDiagnosis] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [items, setItems] = useState<PrescriptionItemCreateData[]>([{ ...DEFAULT_ITEM }]);
  const [creatingPrescription, setCreatingPrescription] = useState(false);
  const [_currentPrescriptionId, setCurrentPrescriptionId] = useState<number | null>(null);
  const [draftPrescriptions, setDraftPrescriptions] = useState<PrescriptionListItem[]>([]);

  // 기존 데이터 로드 (진단명을 처방 진단명 기본값으로)
  useEffect(() => {
    if (encounter) {
      setPrescriptionDiagnosis(encounter.primary_diagnosis || '');
    }
  }, [encounter]);

  // 작성 중인 처방 목록 불러오기
  useEffect(() => {
    if (!patientId) return;

    const fetchDraftPrescriptions = async () => {
      try {
        const prescriptions = await getPrescriptionsByPatient(patientId);
        const list = Array.isArray(prescriptions) ? prescriptions : [];
        setDraftPrescriptions(list.filter((p) => p.status === 'DRAFT'));
      } catch (err) {
        console.error('작성 중 처방 조회 실패:', err);
      }
    };

    fetchDraftPrescriptions();
  }, [patientId]);

  // 처방 항목 추가
  const handleAddItem = () => {
    setItems([...items, { ...DEFAULT_ITEM }]);
  };

  // 처방 항목 삭제
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // 처방 항목 업데이트
  const handleUpdateItem = (
    index: number,
    field: keyof PrescriptionItemCreateData,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // duration_days 변경 시 quantity 자동 계산
    if (field === 'duration_days' || field === 'frequency') {
      const freq = field === 'frequency' ? (value as PrescriptionFrequency) : newItems[index].frequency;
      const days = field === 'duration_days' ? (value as number) : newItems[index].duration_days;
      const multiplier: Record<PrescriptionFrequency, number> = {
        QD: 1,
        BID: 2,
        TID: 3,
        QID: 4,
        PRN: 1,
        QOD: 0.5,
        QW: 1 / 7,
      };
      newItems[index].quantity = Math.ceil(days * multiplier[freq]);
    }

    setItems(newItems);
  };

  // 처방 생성 및 발행
  const handleCreatePrescription = async (issueAfterCreate: boolean = false) => {
    // 유효성 검사
    const validItems = items.filter((item) => item.medication_name.trim() && item.dosage.trim());
    if (validItems.length === 0) {
      alert('최소 1개 이상의 약품 정보를 입력해주세요.');
      return;
    }

    setCreatingPrescription(true);
    try {
      // 처방 생성
      const prescription = await createPrescription({
        patient_id: patientId,
        encounter_id: encounter?.id,
        diagnosis: prescriptionDiagnosis,
        notes: prescriptionNotes,
        items: validItems,
      });

      setCurrentPrescriptionId(prescription.id);

      if (issueAfterCreate) {
        await issuePrescription(prescription.id);
        alert('처방전이 발행되었습니다.');
      } else {
        alert('처방이 저장되었습니다. (작성 중)');
      }

      // 초기화 및 콜백
      setItems([{ ...DEFAULT_ITEM }]);
      setPrescriptionNotes('');
      onPrescriptionCreated?.();

      // 작성 중 목록 새로고침
      const prescriptions = await getPrescriptionsByPatient(patientId);
      const list = Array.isArray(prescriptions) ? prescriptions : [];
      setDraftPrescriptions(list.filter((p) => p.status === 'DRAFT'));
    } catch (err) {
      console.error('처방 생성 실패:', err);
      alert('처방 생성에 실패했습니다.');
    } finally {
      setCreatingPrescription(false);
    }
  };

  // 진료가 시작되지 않은 경우
  if (!encounter) {
    return (
      <div className="clinic-card">
        <div className="clinic-card-header">
          <h3>
            <span className="card-icon">💊</span>
            처방
          </h3>
        </div>
        <div className="clinic-card-body">
          <div className="empty-state">
            <div className="empty-state-icon">💊</div>
            <div className="empty-state-text">
              진료를 시작하면 처방을 입력할 수 있습니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="clinic-card prescription-card">
      <div className="clinic-card-header">
        <h3>
          <span className="card-icon">💊</span>
          처방
          {draftPrescriptions.length > 0 && (
            <span className="draft-count">작성중 {draftPrescriptions.length}</span>
          )}
        </h3>
      </div>
      <div className="clinic-card-body">
        <div className="prescription-section">
          {/* 처방 진단명 */}
          <div className="form-group">
            <label>처방 진단명</label>
            <input
              type="text"
              value={prescriptionDiagnosis}
              onChange={(e) => setPrescriptionDiagnosis(e.target.value)}
              placeholder="처방 관련 진단명"
            />
          </div>

          {/* 처방 항목 목록 */}
          <div className="prescription-items">
            <div className="items-header">
              <label>처방 약품</label>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleAddItem}
                type="button"
              >
                + 약품 추가
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="prescription-item-form">
                <div className="item-row">
                  <div className="form-group flex-2">
                    <input
                      type="text"
                      value={item.medication_name}
                      onChange={(e) =>
                        handleUpdateItem(index, 'medication_name', e.target.value)
                      }
                      placeholder="약품명"
                    />
                  </div>
                  <div className="form-group flex-1">
                    <input
                      type="text"
                      value={item.dosage}
                      onChange={(e) => handleUpdateItem(index, 'dosage', e.target.value)}
                      placeholder="용량 (예: 500mg)"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoveItem(index)}
                      type="button"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="item-row">
                  <div className="form-group">
                    <select
                      value={item.frequency}
                      onChange={(e) =>
                        handleUpdateItem(
                          index,
                          'frequency',
                          e.target.value as PrescriptionFrequency
                        )
                      }
                    >
                      {(Object.keys(FREQUENCY_LABELS) as PrescriptionFrequency[]).map((f) => (
                        <option key={f} value={f}>
                          {FREQUENCY_LABELS[f]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <select
                      value={item.route}
                      onChange={(e) =>
                        handleUpdateItem(index, 'route', e.target.value as PrescriptionRoute)
                      }
                    >
                      {(Object.keys(ROUTE_LABELS) as PrescriptionRoute[]).map((r) => (
                        <option key={r} value={r}>
                          {ROUTE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <input
                      type="number"
                      value={item.duration_days}
                      onChange={(e) =>
                        handleUpdateItem(index, 'duration_days', parseInt(e.target.value) || 1)
                      }
                      min={1}
                      placeholder="일수"
                    />
                    <span className="input-suffix">일</span>
                  </div>
                  <div className="form-group">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)
                      }
                      min={1}
                      placeholder="수량"
                    />
                    <span className="input-suffix">개</span>
                  </div>
                </div>
                <div className="item-row">
                  <div className="form-group flex-1">
                    <input
                      type="text"
                      value={item.instructions || ''}
                      onChange={(e) =>
                        handleUpdateItem(index, 'instructions', e.target.value)
                      }
                      placeholder="복용 지시 (예: 식후 30분)"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 처방 비고 */}
          <div className="form-group">
            <label>처방 비고</label>
            <textarea
              value={prescriptionNotes}
              onChange={(e) => setPrescriptionNotes(e.target.value)}
              placeholder="추가 지시사항..."
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* 푸터: 발행 버튼 */}
      <div className="clinic-card-footer">
        <div className="prescription-actions">
          <button
            className="btn btn-primary"
            onClick={() => handleCreatePrescription(true)}
            disabled={creatingPrescription}
          >
            {creatingPrescription ? '처리 중...' : '처방전 발행'}
          </button>
        </div>
      </div>

      <style>{`
        .prescription-card .clinic-card-body {
          max-height: 400px;
          overflow-y: auto;
        }
        .draft-count {
          font-size: 11px;
          font-weight: normal;
          padding: 2px 8px;
          background: var(--warning, #f57c00);
          color: white;
          border-radius: 10px;
          margin-left: 8px;
        }
        .prescription-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .items-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .items-header label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary, #666);
        }
        .prescription-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .prescription-item-form {
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 6px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .item-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .item-row .form-group {
          margin-bottom: 0;
          flex: 1;
          position: relative;
        }
        .item-row .form-group.flex-2 {
          flex: 2;
        }
        .item-row .form-group.flex-1 {
          flex: 1;
        }
        .item-row input,
        .item-row select {
          width: 100%;
          padding: 6px 8px;
          font-size: 13px;
        }
        .item-row select {
          padding-right: 24px;
        }
        .input-suffix {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 11px;
          color: var(--text-tertiary, #999);
          pointer-events: none;
        }
        .btn-remove {
          width: 24px;
          height: 24px;
          border: none;
          background: var(--error-light, #ffebee);
          color: var(--error, #c62828);
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .btn-remove:hover {
          background: var(--error, #c62828);
          color: white;
        }
        .prescription-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}
