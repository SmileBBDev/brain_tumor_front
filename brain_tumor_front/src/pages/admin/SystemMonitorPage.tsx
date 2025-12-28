// 관리자 시스템 모니터링 페이지
export default function SystemMonitorPage() {
  return (
    <>
    <div className="page admin-monitor">
      <section className="monitor-grid">
        <div className="monitor-card">CPU</div>
        <div className="monitor-card">Memory</div>
        <div className="monitor-card">Active Session</div>
        <div className="monitor-card">Error Rate</div>
      </section>
    </div>

    <div className="admin-page">
      <div className="monitor-grid">
        <div className="monitor-card ok">
          <h3>서버 상태</h3>
          <p>정상</p>
        </div>

        <div className="monitor-card">
          <h3>활성 세션</h3>
          <p>124</p>
        </div>

        <div className="monitor-card">
          <h3>금일 로그인</h3>
          <p>312</p>
        </div>

        <div className="monitor-card warning">
          <h3>오류 발생</h3>
          <p>2건</p>
        </div>
      </div>
    </div>
    </>
    
  );
}
