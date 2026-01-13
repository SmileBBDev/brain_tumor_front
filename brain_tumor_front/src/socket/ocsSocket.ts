/**
 * OCS WebSocket 클라이언트
 * - OCS 상태 변경 실시간 알림 수신
 * - 싱글톤 패턴으로 중복 연결 방지
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

// =============================================================================
// 싱글톤 WebSocket 관리자
// =============================================================================
type EventListener = {
  id: string;
  callbacks: OCSSocketCallbacks;
};

let globalSocket: WebSocket | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;
const listeners: EventListener[] = [];
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

/**
 * 이벤트 리스너 등록 (구독)
 */
export function subscribeOCSSocket(callbacks: OCSSocketCallbacks): string {
  const listenerId = `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  listeners.push({ id: listenerId, callbacks });
  console.log('🔌 [ocsSocket] 리스너 등록:', listenerId, '총 리스너 수:', listeners.length);

  // 연결이 없으면 새로 연결
  if (!globalSocket || globalSocket.readyState === WebSocket.CLOSED) {
    console.log('🔌 [ocsSocket] WebSocket 연결 시작...');
    initGlobalSocket();
  } else {
    console.log('🔌 [ocsSocket] WebSocket 이미 연결됨, readyState:', globalSocket.readyState);
  }

  return listenerId;
}

/**
 * 이벤트 리스너 해제 (구독 취소)
 */
export function unsubscribeOCSSocket(listenerId: string): void {
  const index = listeners.findIndex((l) => l.id === listenerId);
  if (index !== -1) {
    listeners.splice(index, 1);
  }

  // 모든 리스너가 없으면 연결 종료하지 않음 (전역 연결 유지)
  // 필요시 아래 주석 해제하여 자동 종료 가능
  // if (listeners.length === 0) {
  //   closeGlobalSocket();
  // }
}

/**
 * 전역 소켓 초기화
 */
function initGlobalSocket(): void {
  if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
    return; // 이미 연결됨
  }

  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.warn('OCS WebSocket: No access token');
    return;
  }

  const wsUrl = `ws://localhost:8000/ws/ocs/?token=${token}`;
  globalSocket = new WebSocket(wsUrl);

  globalSocket.onopen = () => {
    console.log('OCS WebSocket connected (global)');
    connectionAttempts = 0; // 연결 성공 시 재시도 카운터 리셋
  };

  globalSocket.onmessage = (e) => {
    try {
      const event: OCSEvent = JSON.parse(e.data);
      console.log('📨 [ocsSocket] 메시지 수신:', event.type, event);
      console.log('📨 [ocsSocket] 등록된 리스너 수:', listeners.length);

      // 모든 리스너에게 이벤트 전달
      listeners.forEach(({ id, callbacks }) => {
        console.log('📨 [ocsSocket] 리스너에게 전달:', id, event.type);
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
      });
    } catch (error) {
      console.error('OCS WebSocket message parse error:', error);
    }
  };

  globalSocket.onerror = (error) => {
    console.error('OCS WebSocket error:', error);
    listeners.forEach(({ callbacks }) => callbacks.onError?.(error));
  };

  globalSocket.onclose = () => {
    console.log('OCS WebSocket disconnected (global)');
    listeners.forEach(({ callbacks }) => callbacks.onClose?.());

    // ping interval 정리
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }

    globalSocket = null;

    // 자동 재연결 (리스너가 있고 재시도 횟수 초과하지 않은 경우)
    if (listeners.length > 0 && connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      connectionAttempts++;
      console.log(`OCS WebSocket reconnecting... (attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(() => {
        initGlobalSocket();
      }, RECONNECT_DELAY);
    }
  };

  // Ping 설정
  pingInterval = setInterval(() => {
    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
      globalSocket.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);
}

/**
 * 전역 소켓 종료
 */
export function closeGlobalSocket(): void {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }

  if (globalSocket) {
    globalSocket.close();
    globalSocket = null;
  }

  listeners.length = 0;
}

/**
 * 연결 상태 확인
 */
export function isOCSSocketConnected(): boolean {
  return globalSocket !== null && globalSocket.readyState === WebSocket.OPEN;
}

// =============================================================================
// 기존 API 호환용 (deprecated - subscribeOCSSocket 사용 권장)
// =============================================================================
/**
 * @deprecated Use subscribeOCSSocket instead
 */
export function connectOCSSocket(callbacks: OCSSocketCallbacks): WebSocket | null {
  // 기존 코드 호환을 위해 싱글톤으로 연결하고 구독 추가
  subscribeOCSSocket(callbacks);
  return globalSocket;
}
