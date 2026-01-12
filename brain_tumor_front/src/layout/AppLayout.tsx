import { Navigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import AppHeader from './AppHeader';
import { useAuth } from '@/pages/auth/AuthProvider';
import FullScreenLoader from '@/pages/common/FullScreenLoader';

import Sidebar from '@/layout/Sidebar';
import RequirePasswordChange from '@/pages/auth/RequirePasswordChange';
import { OCSNotificationProvider, useOCSNotificationContext } from '@/context/OCSNotificationContext';
import OCSNotificationToast from '@/components/OCSNotificationToast';

// 전역 Toast 렌더링 컴포넌트
function GlobalOCSToast() {
  const { notifications, removeNotification } = useOCSNotificationContext();
  return (
    <OCSNotificationToast
      notifications={notifications}
      onDismiss={removeNotification}
    />
  );
}

function AppLayoutContent() {
  const { role, isAuthReady } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (!isAuthReady) {
    return <FullScreenLoader />; // 로딩 스피너
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  return (
    <RequirePasswordChange>
      <div className='app-layout'>
        <AppHeader onToggleSidebar={toggleSidebar} />

        <div className='app-body'>
          {isSidebarOpen && <Sidebar/> }
          <main className='app-content'>
             {/* Outlet으로 자식 라우트(AppRoutes) 연결 */}
            <Outlet  />
          </main>
        </div>

        {/* 전역 OCS 알림 Toast */}
        <GlobalOCSToast />
      </div>
    </RequirePasswordChange>
  );
}

function AppLayout() {
  return (
    <OCSNotificationProvider>
      <AppLayoutContent />
    </OCSNotificationProvider>
  );
}

export default AppLayout;