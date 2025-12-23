import { Outlet } from 'react-router-dom';
import type { Role } from '@/types/role';
import Sidebar from './Sidebar';
import AppHeader from './AppHeader';


export default function AppLayout() {
  const role = localStorage.getItem('role') as Role | null;

  return (
    <div className='app-layout'>
       {role && <Sidebar role={role}/> }

      <div className='app-body'>      
         {role && <AppHeader role={role} /> }
        <main className='app-content'>
          <Outlet />
        </main>
      </div>

    </div>
    
  );
}
