import { useEffect, useState } from 'react';
import {
  getSystemMonitorStats,
  getMonitorAlertConfig,
  updateMonitorAlertConfig,
  type SystemMonitorStats,
  type MonitorAlertConfig,
  type MonitorAlertItem
} from '@/services/monitor.api';
import '@/assets/style/adminPageStyle.css';

export default function SystemMonitorPage() {
  const [stats, setStats] = useState<SystemMonitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 알림 설정 상태
  const [alertConfig, setAlertConfig] = useState<MonitorAlertConfig | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<MonitorAlertConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSystemMonitorStats();
      setStats(data);
    } catch (err) {
      setError('시스템 모니터링 데이터를 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertConfig = async () => {
    try {
      const config = await getMonitorAlertConfig();
      setAlertConfig(config);
    } catch (err) {
      console.error('Failed to fetch alert config:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAlertConfig();
    // 30초마다 자동 갱신
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ok': return '정상';
      case 'warning': return '주의';
      case 'error': return '오류';
      default: return status;
    }
  };

  // 현재 활성화된 알림 목록 계산
  const getActiveAlerts = (): { key: string; alert: MonitorAlertItem }[] => {
    if (!stats || !alertConfig) return [];

    const alerts: { key: string; alert: MonitorAlertItem }[] = [];

    // 서버 상태 체크
    if (stats.server.status === 'error') {
      alerts.push({ key: 'server_error', alert: alertConfig.server_error });
    } else if (stats.server.status === 'warning') {
      alerts.push({ key: 'server_warning', alert: alertConfig.server_warning });
    }

    // CPU 체크
    const cpuThreshold = alertConfig.cpu_warning.threshold || 90;
    if (stats.resources.cpu_percent > cpuThreshold) {
      alerts.push({ key: 'cpu_warning', alert: alertConfig.cpu_warning });
    }

    // 메모리 체크
    const memoryThreshold = alertConfig.memory_warning.threshold || 90;
    if (stats.resources.memory_percent > memoryThreshold) {
      alerts.push({ key: 'memory_warning', alert: alertConfig.memory_warning });
    }

    // 디스크 체크
    const diskThreshold = alertConfig.disk_warning.threshold || 90;
    if (stats.resources.disk_percent > diskThreshold) {
      alerts.push({ key: 'disk_warning', alert: alertConfig.disk_warning });
    }

    // 오류 발생 체크
    const errorThreshold = alertConfig.error_warning.threshold || 10;
    if (stats.errors.count > errorThreshold) {
      alerts.push({ key: 'error_warning', alert: alertConfig.error_warning });
    }

    return alerts;
  };

  const openSettingsModal = () => {
    if (alertConfig) {
      setEditingConfig(JSON.parse(JSON.stringify(alertConfig)));
      setShowSettingsModal(true);
    }
  };

  const handleSaveSettings = async () => {
    if (!editingConfig) return;

    setSaving(true);
    try {
      await updateMonitorAlertConfig(editingConfig);
      setAlertConfig(editingConfig);
      setShowSettingsModal(false);
    } catch (err) {
      console.error('Failed to save config:', err);
      alert('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const updateAlertItem = (
    key: keyof MonitorAlertConfig,
    field: keyof MonitorAlertItem,
    value: string | number | string[]
  ) => {
    if (!editingConfig) return;
    setEditingConfig({
      ...editingConfig,
      [key]: {
        ...editingConfig[key],
        [field]: value
      }
    });
  };

  const activeAlerts = getActiveAlerts();

  if (loading && !stats) {
    return (
      <div className="admin-page">
        <div className="monitor-loading">데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="admin-page">
        <div className="monitor-error">
          <p>{error}</p>
          <button onClick={fetchStats}>다시 시도</button>
        </div>
      </div>
    );
  }

  const alertKeys: { key: keyof MonitorAlertConfig; label: string }[] = [
    { key: 'server_warning', label: '서버 주의' },
    { key: 'server_error', label: '서버 오류' },
    { key: 'cpu_warning', label: 'CPU 주의' },
    { key: 'memory_warning', label: '메모리 주의' },
    { key: 'disk_warning', label: '디스크 주의' },
    { key: 'error_warning', label: '오류 발생' },
  ];

  return (
    <div className="admin-page">
      {/* 헤더 */}
      <div className="monitor-header">
        <h2>시스템 모니터링</h2>
        <button className="settings-btn" onClick={openSettingsModal}>
          ⚙️ 알림 설정
        </button>
      </div>

      {/* 모니터링 그리드 */}
      <div className="monitor-grid">
        {/* 서버 상태 */}
        <div className={`monitor-card ${stats?.server.status || 'ok'}`}>
          <h3>서버 상태</h3>
          <p>{getStatusText(stats?.server.status || 'ok')}</p>
          <span className="sub-text">DB: {stats?.server.database || '-'}</span>
        </div>

        {/* CPU */}
        <div className={`monitor-card ${(stats?.resources.cpu_percent || 0) > (alertConfig?.cpu_warning.threshold || 90) ? 'warning' : 'ok'}`}>
          <h3>CPU 사용률</h3>
          <p>{stats?.resources.cpu_percent || 0}%</p>
        </div>

        {/* Memory */}
        <div className={`monitor-card ${(stats?.resources.memory_percent || 0) > (alertConfig?.memory_warning.threshold || 90) ? 'warning' : 'ok'}`}>
          <h3>메모리 사용률</h3>
          <p>{stats?.resources.memory_percent || 0}%</p>
          <span className="sub-text">
            {stats?.resources.memory_used_gb || 0}GB / {stats?.resources.memory_total_gb || 0}GB
          </span>
        </div>

        {/* 디스크 */}
        <div className={`monitor-card ${(stats?.resources.disk_percent || 0) > (alertConfig?.disk_warning.threshold || 90) ? 'warning' : 'ok'}`}>
          <h3>디스크 사용률</h3>
          <p>{stats?.resources.disk_percent || 0}%</p>
        </div>

        {/* 활성 세션 */}
        <div className="monitor-card">
          <h3>활성 세션</h3>
          <p>{stats?.sessions.active_count || 0}</p>
          <span className="sub-text">최근 30분 기준</span>
        </div>

        {/* 금일 로그인 */}
        <div className="monitor-card">
          <h3>금일 로그인</h3>
          <p>{stats?.logins.today_total || 0}</p>
          <span className="sub-text">
            성공 {stats?.logins.today_success || 0} / 실패 {stats?.logins.today_fail || 0}
          </span>
        </div>

        {/* 오류 발생 */}
        <div className={`monitor-card ${(stats?.errors.count || 0) > (alertConfig?.error_warning.threshold || 10) ? 'warning' : 'ok'}`}>
          <h3>오류 발생</h3>
          <p>{stats?.errors.count || 0}건</p>
          <span className="sub-text">로그인 실패 + 잠금</span>
        </div>

        {/* 마지막 갱신 */}
        <div className="monitor-card">
          <h3>마지막 갱신</h3>
          <p style={{ fontSize: '14px' }}>
            {stats?.timestamp
              ? new Date(stats.timestamp).toLocaleTimeString('ko-KR')
              : '-'}
          </p>
          <span className="sub-text">30초마다 자동 갱신</span>
        </div>
      </div>

      {/* 활성 알림 표시 */}
      {activeAlerts.length > 0 && (
        <div className="alert-section">
          <h3>⚠️ 주의/경고 상태 안내</h3>
          {activeAlerts.map(({ key, alert }) => (
            <div key={key} className="alert-box">
              <div className="alert-title">{alert.title}</div>
              <div className="alert-description">{alert.description}</div>
              <ul className="alert-actions">
                {alert.actions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 설정 모달 */}
      {showSettingsModal && editingConfig && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>알림 설정</h3>
              <button className="close-btn" onClick={() => setShowSettingsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {alertKeys.map(({ key, label }) => (
                <div key={key} className="alert-config-item">
                  <h4>{label}</h4>
                  <div className="config-field">
                    <label>제목</label>
                    <input
                      type="text"
                      value={editingConfig[key].title}
                      onChange={(e) => updateAlertItem(key, 'title', e.target.value)}
                    />
                  </div>
                  <div className="config-field">
                    <label>설명</label>
                    <textarea
                      value={editingConfig[key].description}
                      onChange={(e) => updateAlertItem(key, 'description', e.target.value)}
                    />
                  </div>
                  {editingConfig[key].threshold !== undefined && (
                    <div className="config-field">
                      <label>임계값 (%)</label>
                      <input
                        type="number"
                        value={editingConfig[key].threshold}
                        onChange={(e) => updateAlertItem(key, 'threshold', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  )}
                  <div className="config-field">
                    <label>대처 방안 (줄바꿈으로 구분)</label>
                    <textarea
                      value={editingConfig[key].actions.join('\n')}
                      onChange={(e) => updateAlertItem(key, 'actions', e.target.value.split('\n').filter(a => a.trim()))}
                      rows={3}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowSettingsModal(false)}>
                취소
              </button>
              <button className="save-btn" onClick={handleSaveSettings} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
