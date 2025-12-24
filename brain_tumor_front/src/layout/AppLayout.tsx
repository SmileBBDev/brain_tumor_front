import { Outlet, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';
import AppHeader from './AppHeader';
import { useAuth } from '@/pages/auth/AuthProvider';
import FullScreenLoader from '@/pages/common/FullScreenLoader';



export default function AppLayout() {
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
    <div className='app-layout'>
      {role && <AppHeader role={role} onToggleSidebar={toggleSidebar} /> }

      <div className='app-body'>      
        {role && isSidebarOpen && <Sidebar role={role}/> }
        <main className='app-content'>
          <Outlet />
        </main>
      </div>

    </div>
    
  );
}
