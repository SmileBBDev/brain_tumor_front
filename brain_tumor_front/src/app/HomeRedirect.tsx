import { Navigate } from 'react-router-dom';
import { useAuth } from '@/pages/auth/AuthProvider';

export default function HomeRedirect() {
    const token = localStorage.getItem('accessToken');
    const { role, isAuthReady } = useAuth();
    // const role = localStorage.getItem('role') as Role;
    
    if (!isAuthReady) return null;

    if (!role) {
        return <Navigate to="/login" replace />;
    }

    return <Navigate to="/dashboard" replace />;
}
