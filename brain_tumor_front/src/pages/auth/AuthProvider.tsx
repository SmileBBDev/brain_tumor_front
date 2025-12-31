import { createContext, useContext, useEffect, useState } from 'react';
import SessionExtendModal from './SessionExtendModal';
import { connectPermissionSocket } from '@/socket/permissionSocket'
import type { MenuNode } from '@/types/menu';
import { fetchMe, fetchMenu } from './auth.api';

interface User {
  id: number;
  login_id: string;
  name: string;
  role: {
    code: string;
    name: string;
  };
}


interface AuthContextValue {
  user : User | null;
  role: string | null;
  menus: MenuNode[];

  sessionRemain: number;
  isAuthReady: boolean;
  isAuthenticated: boolean;

  logout: () => void;
  hasPermission: (menuId: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [menus, setMenus] = useState<MenuNode[]>([]);

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [sessionRemain, setSessionRemain] = useState(30 * 60);

  // 앱 최초 1회: 서버 기준 인증 초기화
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsAuthReady(true);
        return;
      }

      try {
        const meRes = await fetchMe(); // 내 정보
        const menuRes = await fetchMenu(); // 메뉴

        setUser(meRes.data);
        setRole(meRes.data.role.code);
        setMenus(menuRes.data.menus);
      } catch (e) {
        logout();
      } finally {
        setIsAuthReady(true);
      }
    };

    initAuth();
  }, []);


  const isAuthenticated = !!user;

  // WebSocket 메뉴 갱신
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const ws = connectPermissionSocket(() => {
      fetch('/api/auth/menu/')
        .then(res => res.json())
        .then(res => setMenus(res.menus));
        // .then((menus) => {
        //   setMenus(menus);
        //   localStorage.setItem('menus', JSON.stringify(menus));
        // });
    });

    return () => ws.close();
  }, [isAuthenticated]);

  /** ⏱ 세션 타이머 */
  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = setInterval(() => {
      setSessionRemain((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated]);

  /** 만료 시 연장 또는 로그아웃 */
  
  // 로그아웃 처리
  const logout = () => {
    localStorage.clear();
    setUser(null);
    setRole(null);
    setMenus([]);
    setSessionRemain(30 * 60); // 초기값으로 복원
    setHasWarned(false);    
    setShowExtendModal(false);
  };

  // 로그인 후 25분	-> 연장 모달 1회 표시
  // 연장 클릭	세션 30분 리셋 + 다시 25분 후 재등장
  // 무시	만료 시 자동 로그아웃
  // 재로그인	정상 동작
  const WARNING_TIME = 5 * 60; // 5분
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [hasWarned, setHasWarned] = useState(false);

  useEffect(() => {
    if (sessionRemain <= 0) {
      logout();
      return;
    }
    if (sessionRemain <= WARNING_TIME && !hasWarned) {
      setShowExtendModal(true);
      setHasWarned(true);
    }

  }, [sessionRemain]);

  const extendSession = () => {
    setSessionRemain(30 * 60); // 30분 연장
    setHasWarned(false);          
    setShowExtendModal(false);
  };


  const hasPermission = (menuId: string) => {
    // SYSTEMMANAGER는 모든 메뉴 접근 가능
    if (role === 'SYSTEMMANAGER') return true;

    const walk = (tree: MenuNode[]): boolean =>
      tree.some(m => m.id === menuId || (m.children && walk(m.children)));

    return walk(menus);
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, role, sessionRemain, 
        logout, isAuthReady, 
        menus,
        isAuthenticated,
        hasPermission,
      }}
    >
      {children}
      {showExtendModal && (
      <SessionExtendModal
        remain={sessionRemain}
        onExtend={extendSession}
        onLogout={logout}
      />
    )}
    </AuthContext.Provider>
  );
}

// Context를 안전하게 가져오는 훅
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}