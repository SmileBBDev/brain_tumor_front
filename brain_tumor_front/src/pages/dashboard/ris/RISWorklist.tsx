import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImagingWorklist } from '@/services/imaging.api';
import type { ImagingStudy } from '@/types/imaging';

export function RISWorklist() {
  const navigate = useNavigate();
  const [studies, setStudies] = useState<ImagingStudy[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWorklist();
  }, []);

  const fetchWorklist = async () => {
    setLoading(true);
    try {
      const response = await getImagingWorklist({ page: 1, page_size: 10 });
      const data = Array.isArray(response) ? response : response.results || [];
      setStudies(data);
    } catch (error) {
      console.error('Failed to fetch worklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    navigate('/imaging/worklist');
  };

  const getModalityBadgeClass = (modality: string) => {
    const classes: Record<string, string> = {
      CT: 'badge-primary',
      MRI: 'badge-success',
      PET: 'badge-warning',
      'X-RAY': 'badge-info',
    };
    return classes[modality] || 'badge-secondary';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ordered: '오더 생성',
      scheduled: '검사 예약',
      in_progress: '수행 중',
      completed: '검사 완료',
      reported: '판독 완료',
      cancelled: '취소',
    };
    return labels[status] || status;
  };

  return (
    <section className="worklist-panel">
      <div className="panel-header">
        <h3>영상 검사 워크리스트</h3>
        <button className="btn-link" onClick={handleViewAll}>
          전체 보기 →
        </button>
      </div>

      <div className="worklist-container">
        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : studies.length === 0 ? (
          <div className="empty-state">검사 대기 목록이 없습니다.</div>
        ) : (
          <table className="worklist-table">
            <thead>
              <tr>
                <th>환자</th>
                <th>검사</th>
                <th>상태</th>
                <th>예약일시</th>
              </tr>
            </thead>
            <tbody>
              {studies.map((study) => (
                <tr key={study.id} onClick={() => navigate('/imaging/studies')}>
                  <td>{study.patient_name}</td>
                  <td>
                    <span className={`badge ${getModalityBadgeClass(study.modality)}`}>
                      {study.modality}
                    </span>
                    {' '}{study.body_part}
                  </td>
                  <td>{getStatusLabel(study.status)}</td>
                  <td>
                    {study.scheduled_at
                      ? new Date(study.scheduled_at).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
