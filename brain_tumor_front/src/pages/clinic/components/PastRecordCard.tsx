/**
 * 과거 진료 기록 카드
 * - 환자의 이전 진료 기록 목록
 * - GET /api/encounters/?patient=<id> 사용
 */
import { useMemo } from 'react';
import type { Encounter } from '@/types/encounter';

interface PastRecordCardProps {
  patientId: number;
  encounters: Encounter[];
}

// 진료 유형
const TYPE_LABELS: Record<string, string> = {
  outpatient: '외래',
  inpatient: '입원',
  emergency: '응급',
};

export default function PastRecordCard({
  patientId: _patientId,
  encounters,
}: PastRecordCardProps) {
  // 완료된 진료 기록만 필터링 (최근 순)
  const pastRecords = useMemo(() => {
    return encounters
      .filter((e) => e.status === 'completed')
      .sort((a, b) => new Date(b.encounter_date || '').getTime() - new Date(a.encounter_date || '').getTime())
      .slice(0, 10);
  }, [encounters]);

  return (
    <div className="clinic-card">
      <div className="clinic-card-header">
        <h3>
          <span className="card-icon">📚</span>
          과거 진료 기록
          <span className="record-count">({pastRecords.length})</span>
        </h3>
      </div>
      <div className="clinic-card-body past-record-body">
        {pastRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <div className="empty-state-text">과거 진료 기록이 없습니다.</div>
          </div>
        ) : (
          <div className="record-list">
            {pastRecords.map((record) => (
              <div key={record.id} className="record-item">
                <div className="record-date">
                  <span className="date-main">{record.encounter_date}</span>
                  <span className="date-type">
                    {TYPE_LABELS[record.encounter_type] || record.encounter_type}
                  </span>
                </div>
                <div className="record-content">
                  {record.diagnosis && (
                    <div className="record-diagnosis">
                      <strong>진단:</strong> {record.diagnosis}
                    </div>
                  )}
                  {record.chief_complaint && (
                    <div className="record-complaint">
                      <strong>주호소:</strong> {record.chief_complaint}
                    </div>
                  )}
                  {record.notes && (
                    <div className="record-notes">{record.notes}</div>
                  )}
                  {!record.diagnosis && !record.chief_complaint && !record.notes && (
                    <div className="record-empty">기록 없음</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .record-count {
          font-size: 12px;
          font-weight: normal;
          color: var(--text-secondary, #666);
          margin-left: 4px;
        }
        .past-record-body {
          max-height: 280px;
          overflow-y: auto;
          padding: 0;
        }
        .record-list {
          padding: 0;
        }
        .record-item {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color, #e0e0e0);
        }
        .record-item:last-child {
          border-bottom: none;
        }
        .record-date {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .date-main {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #1a1a1a);
        }
        .date-type {
          font-size: 11px;
          padding: 2px 6px;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 4px;
          color: var(--text-secondary, #666);
        }
        .record-content {
          font-size: 13px;
          color: var(--text-secondary, #666);
        }
        .record-diagnosis {
          margin-bottom: 4px;
          color: var(--text-primary, #1a1a1a);
        }
        .record-complaint {
          margin-bottom: 4px;
        }
        .record-notes {
          font-size: 12px;
          color: var(--text-tertiary, #999);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .record-empty {
          font-size: 12px;
          color: var(--text-tertiary, #999);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
