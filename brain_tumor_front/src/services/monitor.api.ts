import { api } from './api';

// System Monitor 통계 타입
export type SystemMonitorStats = {
  server: {
    status: 'ok' | 'warning' | 'error';
    database: string;
  };
  resources: {
    cpu_percent: number;
    memory_percent: number;
    memory_used_gb: number;
    memory_total_gb: number;
    disk_percent: number;
  };
  sessions: {
    active_count: number;
  };
  logins: {
    today_total: number;
    today_success: number;
    today_fail: number;
    today_locked: number;
  };
  errors: {
    count: number;
  };
  timestamp: string;
};

export const getSystemMonitorStats = async (): Promise<SystemMonitorStats> => {
  const response = await api.get('/system/monitor/');
  return response.data;
};

// 모니터링 알림 설정 타입
export type MonitorAlertItem = {
  title: string;
  description: string;
  threshold?: number;
  actions: string[];
};

export type MonitorAlertConfig = {
  server_warning: MonitorAlertItem;
  server_error: MonitorAlertItem;
  cpu_warning: MonitorAlertItem;
  memory_warning: MonitorAlertItem;
  disk_warning: MonitorAlertItem;
  error_warning: MonitorAlertItem;
};

/**
 * 모니터링 알림 설정 조회
 */
export const getMonitorAlertConfig = async (): Promise<MonitorAlertConfig> => {
  const response = await api.get('/system/config/monitor-alerts/');
  return response.data;
};

/**
 * 모니터링 알림 설정 수정
 */
export const updateMonitorAlertConfig = async (config: MonitorAlertConfig): Promise<void> => {
  await api.put('/system/config/monitor-alerts/', config);
};
