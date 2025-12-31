import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/pages/auth/AuthProvider';
import brainIcon from '@/assets/icon/mri-brain.png';
import Breadcrumb from '@/layout/Breadcrumb';

interface AppHeaderProps {
  onToggleSidebar: () => void;
}

/* 초 → mm:ss */
function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const navigator = useNavigate();

  const { role, sessionRemain, logout } = useAuth(); 

  if (!role) return null; // auth 준비 전 방어

  const handleLogout = () => {
    // 로그아웃 처리 로직 (예: 토큰 삭제, 리다이렉트 등)
    logout(); // AuthProvider에 위임 (권장)
    navigator('/login');
  }

  const tenant = {
    hospitalName: 'OO대학교병원',
    systemName: 'Brain CDSS',
  };

  return (
    <header className="app-header">
      {/* 좌측: 시스템명 (Home) */}
      <div className="header-left">
          
        <button className="hamburger-btn" onClick={onToggleSidebar}>
          ☰
        </button>
        <img src={brainIcon} className="system-logo" />
        <div className="system-title">
          <a href="/dashboard" className="system-name">
            <span>{tenant.hospitalName}</span>&nbsp;
            <strong>{tenant.systemName}</strong>
          </a>
          
        </div>
      </div>

      {/* 중앙 : 현재 메뉴 표시 */}
      <div className="header-center">
          <Breadcrumb />
      </div>

      {/* 우측 : 사용자 정보 */}
      <div className="header-right">
        <div className="user-info">
            <span className="role">시스템 관리자</span>
            <span className="divider">|</span>
            <span className="userIcon">
            <a>
                {/* <i className={`fa-solid ${}`} />  */}
            </a>
            </span>
            <span className="divider">|</span>
            <a onClick={handleLogout}>
                <i className="fa-solid fa-lock"/>&nbsp;로그아웃
            </a>
        </div>
        <div className="timer-display">            
            <span className="current-time">
                <strong>{new Date().toLocaleTimeString()}</strong>
            </span>
            <span className="divider">|</span>
            <span className={`session-timer ${sessionRemain < 300 ? 'danger' : ''}`}>
                ⏱ {formatTime(sessionRemain)}
            </span>
        </div>

        </div>
    </header>
  );
}
