import { useState, useEffect } from 'react';
import { createImagingStudy } from '@/services/imaging.api';
import { getPatients } from '@/services/patient.api';
import { getEncounters } from '@/services/encounter.api';
import type { ImagingStudyCreateData, ImagingModality } from '@/types/imaging';
import type { Patient } from '@/types/patient';
import type { Encounter } from '@/types/encounter';
import '@/pages/patient/PatientCreateModal.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ImagingCreateModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [filteredEncounters, setFilteredEncounters] = useState<Encounter[]>([]);

  const [formData, setFormData] = useState<ImagingStudyCreateData>({
    patient: 0,
    encounter: 0,
    modality: 'MRI',
    body_part: 'brain',
    scheduled_at: '',
    clinical_info: '',
    special_instruction: '',
  });

  const [patientSearch, setPatientSearch] = useState('');

  // 환자 및 진료 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadPatients();
      loadEncounters();
    }
  }, [isOpen]);

  // 환자 선택 시 해당 환자의 진료만 필터링
  useEffect(() => {
    if (formData.patient) {
      const patientEncounters = encounters.filter(
        (e) => e.patient === formData.patient && e.status !== 'cancelled'
      );
      setFilteredEncounters(patientEncounters);
      // 진료가 1개면 자동 선택
      if (patientEncounters.length === 1) {
        setFormData(prev => ({ ...prev, encounter: patientEncounters[0].id }));
      } else {
        setFormData(prev => ({ ...prev, encounter: 0 }));
      }
    } else {
      setFilteredEncounters([]);
    }
  }, [formData.patient, encounters]);

  const loadPatients = async () => {
    try {
      const response = await getPatients({ page: 1, page_size: 1000, status: 'active' });
      const patientList = Array.isArray(response) ? response : response.results || [];
      setPatients(patientList);
    } catch (err) {
      console.error('환자 목록 로드 실패:', err);
    }
  };

  const loadEncounters = async () => {
    try {
      const response = await getEncounters({ page: 1, page_size: 1000 });
      const encounterList = Array.isArray(response) ? response : response.results || [];
      setEncounters(encounterList);
    } catch (err) {
      console.error('진료 목록 로드 실패:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.patient) {
      setError('환자를 선택해주세요.');
      return;
    }
    if (!formData.encounter) {
      setError('진료를 선택해주세요.');
      return;
    }
    if (!formData.modality) {
      setError('검사 종류를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      await createImagingStudy(formData);
      alert('영상 검사 오더가 생성되었습니다.');
      onSuccess();
    } catch (err: any) {
      console.error('영상 검사 오더 생성 실패:', err);
      setError(err.response?.data?.detail || err.response?.data?.error || '오더 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'patient' || name === 'encounter' ? parseInt(value) || 0 : value
    }));
  };

  const filteredPatients = patients.filter(p =>
    p.name.includes(patientSearch) || p.patient_number.includes(patientSearch)
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>영상 검사 오더 생성</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="patient">환자 *</label>
                <input
                  type="text"
                  placeholder="환자 검색 (이름, 환자번호)"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <select
                  id="patient"
                  name="patient"
                  value={formData.patient}
                  onChange={handleChange}
                  required
                  style={{ width: '100%' }}
                >
                  <option value={0}>환자를 선택하세요</option>
                  {filteredPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.patient_number}) - {p.gender === 'M' ? '남' : '여'}, {p.age}세
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="encounter">진료 *</label>
                <select
                  id="encounter"
                  name="encounter"
                  value={formData.encounter}
                  onChange={handleChange}
                  required
                  disabled={!formData.patient}
                  style={{ width: '100%' }}
                >
                  <option value={0}>진료를 선택하세요</option>
                  {filteredEncounters.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.encounter_type_display} - {new Date(e.admission_date).toLocaleDateString('ko-KR')} - {e.chief_complaint}
                    </option>
                  ))}
                </select>
                {formData.patient && filteredEncounters.length === 0 && (
                  <small style={{ color: '#ff9800' }}>
                    선택한 환자에게 진행 중인 진료가 없습니다.
                  </small>
                )}
              </div>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="modality">검사 종류 *</label>
                <select
                  id="modality"
                  name="modality"
                  value={formData.modality}
                  onChange={handleChange}
                  required
                >
                  <option value="MRI">MRI (Magnetic Resonance Imaging)</option>
                  <option value="CT">CT (Computed Tomography)</option>
                  <option value="PET">PET (Positron Emission Tomography)</option>
                  <option value="X-RAY">X-Ray</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="body_part">촬영 부위</label>
                <input
                  type="text"
                  id="body_part"
                  name="body_part"
                  value={formData.body_part}
                  onChange={handleChange}
                  placeholder="예: brain, chest, abdomen"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="scheduled_at">검사 예약 일시</label>
                <input
                  type="datetime-local"
                  id="scheduled_at"
                  name="scheduled_at"
                  value={formData.scheduled_at}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="clinical_info">임상 정보</label>
                <textarea
                  id="clinical_info"
                  name="clinical_info"
                  value={formData.clinical_info}
                  onChange={handleChange}
                  rows={3}
                  placeholder="예: Headache, rule out brain tumor"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="special_instruction">특별 지시사항</label>
                <textarea
                  id="special_instruction"
                  name="special_instruction"
                  value={formData.special_instruction}
                  onChange={handleChange}
                  rows={2}
                  placeholder="검사 시 특별히 주의할 사항"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose} disabled={loading}>
              취소
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? '생성 중...' : '오더 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
