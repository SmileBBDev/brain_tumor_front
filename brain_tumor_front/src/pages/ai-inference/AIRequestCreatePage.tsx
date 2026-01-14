/**
 * AI 추론 요청 생성 페이지
 * - 환자 선택
 * - 모델 선택 및 데이터 검증
 * - 추론 요청 생성
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePatientAvailableModels, useCreateAIRequest } from '@/hooks';
import { LoadingSpinner, useToast } from '@/components/common';
import { getPatients, searchPatients } from '@/services/patient.api';
import type { AvailableModel, DataValidationResult } from '@/services/ai.api';
import './AIRequestCreatePage.css';

interface Patient {
  id: number;
  patient_number: string;
  name: string;
  birth_date: string;
  gender: string;
}

export default function AIRequestCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // URL에서 환자 ID 추출 (환자 상세에서 바로 이동한 경우)
  const initialPatientId = searchParams.get('patientId');

  // 상태
  const [step, setStep] = useState<'patient' | 'model' | 'confirm'>('patient');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedModel, setSelectedModel] = useState<AvailableModel | null>(null);
  const [priority, setPriority] = useState<string>('normal');
  const [validationResult, setValidationResult] = useState<DataValidationResult | null>(null);

  // Hooks
  const { models: _models, availableModels, unavailableModels, loading: modelsLoading } = usePatientAvailableModels(
    selectedPatient?.id ?? null
  );
  const { create, validate, creating, validating, error } = useCreateAIRequest();

  // 환자 목록 로드 (컴포넌트 마운트 시 1회만 실행)
  useEffect(() => {
    const loadPatients = async () => {
      setPatientsLoading(true);
      try {
        const response = await getPatients({ page: 1, page_size: 1000 });
        const patientList = Array.isArray(response) ? response : response.results || [];
        setPatients(patientList);
      } catch (err) {
        console.error('Failed to load patients:', err);
      } finally {
        setPatientsLoading(false);
      }
    };
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 초기 환자 ID로 환자 정보 조회
  useEffect(() => {
    if (initialPatientId && patients.length > 0) {
      const patient = patients.find(p => p.id === Number(initialPatientId));
      if (patient) {
        setSelectedPatient(patient);
        setStep('model');
      }
    }
  }, [initialPatientId, patients]);

  // 검색어로 필터링된 환자 목록
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(query) ||
        patient.patient_number.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  // 환자 선택
  const handleSelectPatient = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setSelectedModel(null);
    setValidationResult(null);
    setStep('model');
  }, []);

  // 모델 선택
  const handleSelectModel = useCallback(
    async (model: AvailableModel) => {
      if (!model.is_available || !selectedPatient) return;

      setSelectedModel(model);

      // 데이터 검증 실행
      try {
        const result = await validate(selectedPatient.id, model.code);
        setValidationResult(result);

        if (result.valid) {
          setStep('confirm');
        } else {
          toast.warning('필요한 데이터가 부족합니다. 상세 내용을 확인해주세요.');
        }
      } catch (err) {
        toast.error('데이터 검증에 실패했습니다.');
      }
    },
    [selectedPatient, validate, toast]
  );

  // 요청 생성
  const handleCreate = useCallback(async () => {
    if (!selectedPatient || !selectedModel) return;

    try {
      const request = await create(selectedPatient.id, selectedModel.code, priority);
      toast.success('AI 분석 요청이 생성되었습니다.');
      navigate(`/ai/requests/${request.id}`);
    } catch (err) {
      toast.error('AI 분석 요청 생성에 실패했습니다.');
    }
  }, [selectedPatient, selectedModel, priority, create, navigate, toast]);

  // 뒤로 가기
  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('model');
    } else if (step === 'model') {
      setStep('patient');
      setSelectedPatient(null);
      setSelectedModel(null);
      setValidationResult(null);
    } else {
      navigate(-1);
    }
  }, [step, navigate]);

  return (
    <div className="page ai-request-create">
      {/* 헤더 */}
      <header className="page-header">
        <button className="btn btn-back" onClick={handleBack}>
          &larr; 뒤로
        </button>
        <div className="header-content">
          <h2>새 AI 분석 요청</h2>
          <span className="subtitle">
            {step === 'patient' && '환자를 선택해주세요'}
            {step === 'model' && 'AI 모델을 선택해주세요'}
            {step === 'confirm' && '요청 내용을 확인해주세요'}
          </span>
        </div>
      </header>

      {/* 진행 단계 표시 */}
      <div className="step-indicator">
        <div className={`step ${step === 'patient' ? 'active' : selectedPatient ? 'completed' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">환자 선택</span>
        </div>
        <div className="step-divider"></div>
        <div className={`step ${step === 'model' ? 'active' : selectedModel ? 'completed' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">모델 선택</span>
        </div>
        <div className="step-divider"></div>
        <div className={`step ${step === 'confirm' ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">확인 및 요청</span>
        </div>
      </div>

      {/* Step 1: 환자 선택 */}
      {step === 'patient' && (
        <section className="step-content patient-selection">
          <div className="searchable-dropdown">
            <label>환자 선택</label>
            <input
              type="text"
              className="search-input"
              placeholder="환자명 또는 환자번호로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {patientsLoading ? (
              <LoadingSpinner text="환자 목록을 불러오는 중..." />
            ) : (
              <select
                className="searchable-select"
                size={10}
                value={selectedPatient?.id || ''}
                onChange={(e) => {
                  const patient = patients.find(p => p.id === Number(e.target.value));
                  if (patient) {
                    handleSelectPatient(patient);
                  }
                }}
              >
                <option value="">환자를 선택하세요</option>
                {filteredPatients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.patient_number} - {patient.name} ({patient.gender === 'M' ? '남' : '여'}, {patient.birth_date})
                  </option>
                ))}
              </select>
            )}
            {searchQuery && filteredPatients.length === 0 && !patientsLoading && (
              <div className="empty-result">
                <p>검색 결과가 없습니다.</p>
              </div>
            )}
            <div className="search-info">
              총 {filteredPatients.length}명의 환자
              {searchQuery && ` (검색어: "${searchQuery}")`}
            </div>
          </div>
        </section>
      )}

      {/* Step 2: 모델 선택 */}
      {step === 'model' && selectedPatient && (
        <section className="step-content model-selection">
          <div className="selected-patient-info">
            <span className="label">선택된 환자:</span>
            <span className="patient-name">{selectedPatient.name}</span>
            <span className="patient-number">({selectedPatient.patient_number})</span>
          </div>

          {modelsLoading ? (
            <LoadingSpinner text="사용 가능한 모델을 확인하는 중..." />
          ) : (
            <>
              {/* 사용 가능한 모델 */}
              <div className="model-section">
                <h3>사용 가능한 모델</h3>
                {availableModels.length > 0 ? (
                  <div className="model-list">
                    {availableModels.map((model) => (
                      <div
                        key={model.code}
                        className={`model-card available ${selectedModel?.code === model.code ? 'selected' : ''}`}
                        onClick={() => handleSelectModel(model)}
                      >
                        <div className="model-header">
                          <span className="model-name">{model.name}</span>
                          <span className="model-code">{model.code}</span>
                        </div>
                        <p className="model-description">{model.description}</p>
                        <div className="model-data">
                          <span className="available-keys">
                            사용 데이터: {model.available_keys.join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-models">
                    <p>사용 가능한 모델이 없습니다.</p>
                    <p className="hint">필요한 검사 데이터가 충족되면 모델을 사용할 수 있습니다.</p>
                  </div>
                )}
              </div>

              {/* 데이터 부족 모델 */}
              {unavailableModels.length > 0 && (
                <div className="model-section unavailable">
                  <h3>데이터 부족 모델</h3>
                  <div className="model-list">
                    {unavailableModels.map((model) => (
                      <div key={model.code} className="model-card disabled">
                        <div className="model-header">
                          <span className="model-name">{model.name}</span>
                          <span className="model-code">{model.code}</span>
                        </div>
                        <p className="model-description">{model.description}</p>
                        <div className="model-data missing">
                          <span className="missing-keys">
                            필요 데이터: {model.missing_keys.join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 검증 결과 */}
              {validating && <LoadingSpinner text="데이터 검증 중..." />}

              {validationResult && !validationResult.valid && (
                <div className="validation-error">
                  <h4>데이터 검증 실패</h4>
                  <p>누락된 데이터: {validationResult.missing_keys.join(', ')}</p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Step 3: 확인 및 요청 */}
      {step === 'confirm' && selectedPatient && selectedModel && validationResult?.valid && (
        <section className="step-content confirmation">
          <div className="confirmation-card">
            <h3>AI 분석 요청 확인</h3>

            <div className="info-group">
              <label>환자 정보</label>
              <div className="info-value">
                <span className="patient-name">{selectedPatient.name}</span>
                <span className="patient-number">{selectedPatient.patient_number}</span>
              </div>
            </div>

            <div className="info-group">
              <label>분석 모델</label>
              <div className="info-value">
                <span className="model-name">{selectedModel.name}</span>
                <span className="model-code">({selectedModel.code})</span>
              </div>
            </div>

            <div className="info-group">
              <label>사용 데이터</label>
              <div className="info-value">
                <ul className="data-list">
                  {validationResult.available_keys.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="info-group">
              <label>우선순위</label>
              <div className="priority-selector">
                {['low', 'normal', 'high', 'urgent'].map((p) => (
                  <button
                    key={p}
                    className={`priority-btn ${priority === p ? 'selected' : ''} priority-${p}`}
                    onClick={() => setPriority(p)}
                  >
                    {p === 'low' && '낮음'}
                    {p === 'normal' && '보통'}
                    {p === 'high' && '높음'}
                    {p === 'urgent' && '긴급'}
                  </button>
                ))}
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn btn-secondary" onClick={handleBack}>
                이전
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? '요청 중...' : 'AI 분석 요청'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>
        </section>
      )}

      <toast.ToastContainer position="top-right" />
    </div>
  );
}
