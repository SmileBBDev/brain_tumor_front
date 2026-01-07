import { useState, useEffect } from 'react';
import SummaryCard from '@/pages/common/SummaryCard';
import { getImagingWorklist } from '@/services/imaging.api';

export function RISSummaryCards() {
  const [todayStudies, setTodayStudies] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [urgentStudies, setUrgentStudies] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // 오늘의 검사 대기 목록
      const response = await getImagingWorklist({ page: 1, page_size: 100 });
      const studies = Array.isArray(response) ? response : response.results || [];

      setTodayStudies(studies.length);

      // 판독 대기 (completed 상태지만 판독문 없음)
      const pending = studies.filter(s => s.status === 'completed' && !s.report);
      setPendingReports(pending.length);

      // 응급 검사 (clinical_info에 '응급' 포함)
      const urgent = studies.filter(s =>
        s.clinical_info?.includes('응급') ||
        s.clinical_info?.includes('emergency') ||
        s.special_instruction?.includes('응급')
      );
      setUrgentStudies(urgent.length);

      // 오늘 판독 완료 (reported 상태)
      const completed = studies.filter(s => s.status === 'reported');
      setCompletedToday(completed.length);
    } catch (error) {
      console.error('Failed to fetch imaging stats:', error);
    }
  };

  return (
    <section className="summary-cards">
      <SummaryCard title="오늘 검사 대기" value={todayStudies} />
      <SummaryCard title="판독 대기" value={pendingReports} highlight />
      <SummaryCard title="응급 검사" value={urgentStudies} danger />
      <SummaryCard title="오늘 판독 완료" value={completedToday} />
    </section>
  );
}
