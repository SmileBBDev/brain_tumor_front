/**
 * OCS WebSocket 클라이언트
 * - OCS 상태 변경 실시간 알림 수신
 */

export type OCSEventType = 'OCS_STATUS_CHANGED' | 'OCS_CREATED' | 'OCS_CANCELLED';

export interface OCSStatusChangedEvent {
  type: 'OCS_STATUS_CHANGED';
  ocs_id: string;
  ocs_pk: number;
  from_status: string;
  to_status: string;
  job_role: string;
  patient_name: string;
  actor_name: string;
  message: string;
  timestamp: string;
}

export interface OCSCreatedEvent {
  type: 'OCS_CREATED';
  ocs_id: string;
  ocs_pk: number;
  job_role: string;
  job_type: string;
  priority: string;
  patient_name: string;
  doctor_name: string;
  message: string;
  timestamp: string;
}

export interface OCSCancelledEvent {
  type: 'OCS_CANCELLED';
  ocs_id: string;
  ocs_pk: number;
  reason: string;
  actor_name: string;
  message: string;
  timestamp: string;
}

export type OCSEvent = OCSStatusChangedEvent | OCSCreatedEvent | OCSCancelledEvent;

export interface OCSSocketCallbacks {
  onStatusChanged?: (event: OCSStatusChangedEvent) => void;
  onCreated?: (event: OCSCreatedEvent) => void;
  onCancelled?: (event: OCSCancelledEvent) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

/**
 * OCS WebSocket 연결
 */
export function connectOCSSocket(callbacks: OCSSocketCallbacks): WebSocket | null {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.warn('OCS WebSocket: No access token');
    return null;
  }

  const wsUrl = `ws://localhost:8000/ws/ocs/?token=${token}`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('OCS WebSocket connected');
  };

  ws.onmessage = (e) => {
    try {
      const event: OCSEvent = JSON.parse(e.data);

      switch (event.type) {
        case 'OCS_STATUS_CHANGED':
          callbacks.onStatusChanged?.(event);
          break;
        case 'OCS_CREATED':
          callbacks.onCreated?.(event);
          break;
        case 'OCS_CANCELLED':
          callbacks.onCancelled?.(event);
          break;
      }
    } catch (error) {
      console.error('OCS WebSocket message parse error:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('OCS WebSocket error:', error);
    callbacks.onError?.(error);
  };

  ws.onclose = () => {
    console.log('OCS WebSocket disconnected');
    callbacks.onClose?.();
  };

  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);

  const originalOnClose = ws.onclose;
  ws.onclose = (e) => {
    clearInterval(pingInterval);
    if (originalOnClose) {
      originalOnClose.call(ws, e);
    }
  };

  return ws;
}
