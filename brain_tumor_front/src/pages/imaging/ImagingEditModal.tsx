import { useState } from 'react';
import { updateImagingStudy } from '@/services/imaging.api';
import type { ImagingStudy, ImagingStudyUpdateData, ImagingModality, ImagingStatus } from '@/types/imaging';
import '@/pages/patient/PatientCreateModal.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  study: ImagingStudy;
};

export default function ImagingEditModal({ isOpen, onClose, onSuccess, study }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<ImagingStudyUpdateData>({
    modality: study.modality,
    body_part: study.body_part,
    status: study.status,
    scheduled_at: study.scheduled_at || '',
    performed_at: study.performed_at || '',
    clinical_info: study.clinical_info,
    special_instruction: study.special_instruction,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await updateImagingStudy(study.id, formData);
      alert('영상 검사 정보가 수정되었습니다.');
      onSuccess();
    } catch (err: any) {
      console.error('영상 검사 수정 실패:', err);
      setError(err.response?.data?.detail || err.response?.data?.error || '수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>영상 검사 정보 수정</h2>
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
                <label>환자</label>
                <input
                  type="text"
                  value={`${study.patient_name} (${study.patient_number})`}
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </div>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="modality">검사 종류</label>
                <select
                  id="modality"
                  name="modality"
                  value={formData.modality}
                  onChange={handleChange}
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
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status">상태</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="ordered">오더 생성</option>
                  <option value="scheduled">검사 예약</option>
                  <option value="in-progress">검사 수행 중</option>
                  <option value="completed">검사 완료</option>
                  <option value="reported">판독 완료</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

              <div className="form-group">
                <label htmlFor="performed_at">검사 수행 일시</label>
                <input
                  type="datetime-local"
                  id="performed_at"
                  name="performed_at"
                  value={formData.performed_at}
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
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose} disabled={loading}>
              취소
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? '수정 중...' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
