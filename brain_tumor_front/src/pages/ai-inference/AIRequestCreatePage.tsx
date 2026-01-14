/**
 * AI 추론 요청 생성 페이지
 * - 환자 선택
 * - 모델 선택
 * - OCS 선택 (모델에 필요한 데이터 소스)
 * - 추론 요청 생성
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingSpinner, useToast } from '@/components/common';
import { getPatients } from '@/services/patient.api';
import {
  getAIModels,
  createAIRequest,
  getOCSForModel,
  type AIModel,
  type OCSForModelItem,
} from '@/services/ai.api';
import './AIRequestCreatePage.css';

interface Patient {
  id: number;
  patient_number: string;
  name: string;
  birth_date: string;
  gender: string;
}

// OCS 상태 라벨
const OCS_STATUS_LABELS: Record<string, string> = {
  ORDERED: '오더됨',
  ACCEPTED: '접수됨',
  IN_PROGRESS: '진행 중',
  RESULT_READY: '결과 대기',
  CONFIRMED: '확정됨',
  CANCELLED: '취소됨',
};

// 검사 유형 라벨
const JOB_TYPE_LABELS: Record<string, string> = {
  MRI: 'MRI',
  CT: 'CT',
  XRAY: 'X-Ray',
  BLOOD: '혈액검사',
  URINE: '소변검사',
  GENETIC: '유전자검사',
  PROTEIN: '단백질검사',
  PATHOLOGY: '병리검사',
};

export default function AIRequestCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // URL에서 환자 ID 추출 (환자 상세에서 바로 이동한 경우)
  const initialPatientId = searchParams.get('patientId');

  // 상태
  const [step, setStep] = useState<'patient' | 'model' | 'ocs' | 'confirm'>('patient');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // 모델 관련 상태
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

  // OCS 관련 상태 (모델에 적합한 OCS 목록)
  const [ocsList, setOcsList] = useState<OCSForModelItem[]>([]);
  const [ocsLoading, setOcsLoading] = useState(false);
  const [selectedOcsIds, setSelectedOcsIds] = useState<number[]>([]);

  // 요청 관련 상태
  const [priority, setPriority] = useState<string>('normal');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  // 모델 목록 로드
  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const modelList = await getAIModels();
        setModels(modelList.filter(m => m.is_active));
      } catch (err) {
        console.error('Failed to load models:', err);
      } finally {
        setModelsLoading(false);
      }
    };
    loadModels();
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

  // 모델 선택 시 해당 모델에 적합한 OCS 목록 로드
  useEffect(() => {
    if (!selectedPatient || !selectedModel) {
      setOcsList([]);
      return;
    }

    const loadOCSForModel = async () => {
      setOcsLoading(true);
      try {
        const response = await getOCSForModel(selectedPatient.id, selectedModel.code);
        setOcsList(response.ocs_list);
      } catch (err) {
        console.error('Failed to load OCS for model:', err);
        setOcsList([]);
      } finally {
        setOcsLoading(false);
      }
    };
    loadOCSForModel();
  }, [selectedPatient, selectedModel]);

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

  // 선택한 모델에 필요한 OCS 타입 추출
  const requiredJobRoles = useMemo(() => {
    if (!selectedModel || !selectedModel.required_keys) return [];
    return Object.keys(selectedModel.required_keys);
  }, [selectedModel]);

  // 모델에 적합한(compatible) OCS만 필터링
  const compatibleOcsList = useMemo(() => {
    return ocsList.filter(ocs => ocs.is_compatible);
  }, [ocsList]);

  // 모델에 부적합한(incompatible) OCS
  const incompatibleOcsList = useMemo(() => {
    return ocsList.filter(ocs => !ocs.is_compatible);
  }, [ocsList]);

  // 환자 선택
  const handleSelectPatient = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setSelectedModel(null);
    setSelectedOcsIds([]);
    setStep('model');
  }, []);

  // 모델 선택
  const handleSelectModel = useCallback((model: AIModel) => {
    setSelectedModel(model);
    setSelectedOcsIds([]);
    setStep('ocs');
  }, []);

  // OCS 선택/해제 토글
  const handleToggleOcs = useCallback((ocsId: number) => {
    setSelectedOcsIds(prev => {
      if (prev.includes(ocsId)) {
        return prev.filter(id => id !== ocsId);
      }
      return [...prev, ocsId];
    });
  }, []);

  // OCS 선택 완료 → 확인 단계로
  const handleOcsSelectionComplete = useCallback(() => {
    if (selectedOcsIds.length === 0) {
      toast.warning('최소 1개 이상의 검사를 선택해주세요.');
      return;
    }
    setStep('confirm');
  }, [selectedOcsIds.length, toast]);

  // 요청 생성
  const handleCreate = useCallback(async () => {
    if (!selectedPatient || !selectedModel || selectedOcsIds.length === 0) return;

    setCreating(true);
    setError(null);
    try {
      const request = await createAIRequest({
        patient_id: selectedPatient.id,
        model_code: selectedModel.code,
        priority,
        ocs_ids: selectedOcsIds,
      });
      toast.success('AI 분석 요청이 생성되었습니다.');
      navigate(`/ai/requests/${request.id}`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'AI 분석 요청 생성에 실패했습니다.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  }, [selectedPatient, selectedModel, selectedOcsIds, priority, navigate, toast]);

  // 뒤로 가기
  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('ocs');
    } else if (step === 'ocs') {
      setStep('model');
      setSelectedOcsIds([]);
    } else if (step === 'model') {
      setStep('patient');
      setSelectedPatient(null);
      setSelectedModel(null);
      setSelectedOcsIds([]);
    } else {
      navigate(-1);
    }
  }, [step, navigate]);

  // 선택된 OCS 정보 가져오기
  const selectedOcsInfo = useMemo(() => {
    return ocsList.filter(ocs => selectedOcsIds.includes(ocs.id));
  }, [ocsList, selectedOcsIds]);

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
            {step === 'ocs' && '분석할 검사를 선택해주세요'}
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
        <div className={`step ${step === 'ocs' ? 'active' : selectedOcsIds.length > 0 ? 'completed' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">검사 선택</span>
        </div>
        <div className="step-divider"></div>
        <div className={`step ${step === 'confirm' ? 'active' : ''}`}>
          <span className="step-number">4</span>
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
            <LoadingSpinner text="AI 모델을 불러오는 중..." />
          ) : (
            <div className="model-section">
              <h3>AI 모델 선택</h3>
              {models.length > 0 ? (
                <div className="model-list">
                  {models.map((model) => (
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
                        <span className="required-sources">
                          필요 데이터: {Object.keys(model.required_keys || {}).join(', ') || '없음'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-models">
                  <p>사용 가능한 AI 모델이 없습니다.</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Step 3: OCS 선택 */}
      {step === 'ocs' && selectedPatient && selectedModel && (
        <section className="step-content ocs-selection">
          <div className="selected-info-row">
            <div className="selected-patient-info">
              <span className="label">환자:</span>
              <span className="patient-name">{selectedPatient.name}</span>
              <span className="patient-number">({selectedPatient.patient_number})</span>
            </div>
            <div className="selected-model-info">
              <span className="label">모델:</span>
              <span className="model-name">{selectedModel.name}</span>
            </div>
          </div>

          <div className="ocs-section">
            <h3>
              분석할 검사 선택
              <span className="ocs-hint">
                ({requiredJobRoles.join(', ')} 유형의 확정된 검사)
              </span>
            </h3>

            {ocsLoading ? (
              <LoadingSpinner text="검사 목록을 불러오는 중..." />
            ) : compatibleOcsList.length > 0 ? (
              <>
                <div className="ocs-list">
                  {compatibleOcsList.map((ocs) => (
                    <div
                      key={ocs.id}
                      className={`ocs-card ${selectedOcsIds.includes(ocs.id) ? 'selected' : ''}`}
                      onClick={() => handleToggleOcs(ocs.id)}
                    >
                      <div className="ocs-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedOcsIds.includes(ocs.id)}
                          onChange={() => handleToggleOcs(ocs.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="ocs-content">
                        <div className="ocs-header">
                          <span className={`job-role-badge ${ocs.job_role.toLowerCase()}`}>
                            {ocs.job_role}
                          </span>
                          <span className="ocs-type">
                            {JOB_TYPE_LABELS[ocs.job_type] || ocs.job_type}
                          </span>
                          <span className={`status-badge ${ocs.ocs_status.toLowerCase()}`}>
                            {OCS_STATUS_LABELS[ocs.ocs_status] || ocs.ocs_status}
                          </span>
                        </div>
                        <div className="ocs-meta">
                          <span className="ocs-id">{ocs.ocs_id}</span>
                          <span className="ocs-date">{ocs.created_at?.slice(0, 10)}</span>
                        </div>
                        {ocs.available_keys.length > 0 && (
                          <div className="ocs-keys">
                            <span className="keys-label">사용 가능 데이터:</span>
                            {ocs.available_keys.map((key) => (
                              <span key={key} className="key-badge available">{key}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 부적합한 OCS도 표시 (선택 불가) */}
                {incompatibleOcsList.length > 0 && (
                  <div className="incompatible-section">
                    <h4>필요 데이터 부족 ({incompatibleOcsList.length}건)</h4>
                    <div className="ocs-list incompatible">
                      {incompatibleOcsList.map((ocs) => (
                        <div key={ocs.id} className="ocs-card disabled">
                          <div className="ocs-content">
                            <div className="ocs-header">
                              <span className={`job-role-badge ${ocs.job_role.toLowerCase()}`}>
                                {ocs.job_role}
                              </span>
                              <span className="ocs-type">
                                {JOB_TYPE_LABELS[ocs.job_type] || ocs.job_type}
                              </span>
                            </div>
                            <div className="ocs-meta">
                              <span className="ocs-id">{ocs.ocs_id}</span>
                              <span className="ocs-date">{ocs.created_at?.slice(0, 10)}</span>
                            </div>
                            {ocs.missing_keys.length > 0 && (
                              <div className="ocs-keys">
                                <span className="keys-label">누락 데이터:</span>
                                {ocs.missing_keys.map((key) => (
                                  <span key={key} className="key-badge missing">{key}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="ocs-selection-footer">
                  <span className="selection-count">
                    {selectedOcsIds.length}개 선택됨
                  </span>
                  <button
                    className="btn btn-primary"
                    onClick={handleOcsSelectionComplete}
                    disabled={selectedOcsIds.length === 0}
                  >
                    다음
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-ocs">
                <p>선택한 모델에 필요한 데이터를 가진 검사가 없습니다.</p>
                <p className="hint">
                  이 모델은 {requiredJobRoles.join(', ')} 유형의 검사에서<br />
                  {selectedModel?.required_keys && Object.entries(selectedModel.required_keys).map(([role, keys]) => (
                    <span key={role}>{role}: {(keys as string[]).join(', ')}<br /></span>
                  ))}
                  데이터가 필요합니다.
                </p>
                {/* 부적합한 OCS가 있으면 표시 */}
                {incompatibleOcsList.length > 0 && (
                  <div className="incompatible-section">
                    <h4>데이터 부족한 검사 ({incompatibleOcsList.length}건)</h4>
                    <div className="ocs-list incompatible">
                      {incompatibleOcsList.map((ocs) => (
                        <div key={ocs.id} className="ocs-card disabled">
                          <div className="ocs-content">
                            <div className="ocs-header">
                              <span className={`job-role-badge ${ocs.job_role.toLowerCase()}`}>
                                {ocs.job_role}
                              </span>
                              <span className="ocs-type">
                                {JOB_TYPE_LABELS[ocs.job_type] || ocs.job_type}
                              </span>
                            </div>
                            <div className="ocs-meta">
                              <span className="ocs-id">{ocs.ocs_id}</span>
                            </div>
                            {ocs.missing_keys.length > 0 && (
                              <div className="ocs-keys">
                                <span className="keys-label">누락:</span>
                                {ocs.missing_keys.map((key) => (
                                  <span key={key} className="key-badge missing">{key}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 4: 확인 및 요청 */}
      {step === 'confirm' && selectedPatient && selectedModel && selectedOcsIds.length > 0 && (
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
              <label>선택된 검사 ({selectedOcsIds.length}건)</label>
              <div className="info-value">
                <ul className="data-list">
                  {selectedOcsInfo.map((ocs) => (
                    <li key={ocs.id}>
                      <span className={`job-role-badge small ${ocs.job_role.toLowerCase()}`}>
                        {ocs.job_role}
                      </span>
                      {JOB_TYPE_LABELS[ocs.job_type] || ocs.job_type} - {ocs.ocs_id}
                    </li>
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
