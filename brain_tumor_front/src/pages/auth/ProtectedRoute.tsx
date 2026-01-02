import { Navigate } from 'react-router-dom';
import { useAuth } from '@/pages/auth/AuthProvider';

// 권한 가이드
interface Props{
    menuId : string; // MenuNode.id
    children : React.ReactNode;
}

export default function ProtectedRoute({ menuId, children }: Props){
    const { isAuthReady, hasPermission, menus } = useAuth();

    // Auth 초기화 대기
    if (!isAuthReady || menus.length === 0) return null;
    
    
    // 권한 없음
    if (!hasPermission(menuId)) {
        return <Navigate to="/403" replace />;
    }

    return <>{children}</>;
}