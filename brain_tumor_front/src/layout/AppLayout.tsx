import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import AppHeader from './AppHeader';
import { useAuth } from '@/pages/auth/AuthProvider';
import FullScreenLoader from '@/pages/common/FullScreenLoader';

import Sidebar from '@/layout/Sidebar';
import AppRoutes from '@/router/AppRoutes';
import RequirePasswordChange from '@/pages/auth/RequirePasswordChange';

function AppLayout() {
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
            <AppRoutes />
          </main>
        </div>

      </div>
    </RequirePasswordChange>
  );
}
export default AppLayout;