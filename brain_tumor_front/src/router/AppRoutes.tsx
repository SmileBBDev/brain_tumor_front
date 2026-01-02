import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/pages/auth/AuthProvider';
import ProtectedRoute from '@/pages/auth/ProtectedRoute';
import { routeMap } from './routeMap';
import type { MenuNode } from '@/types/menu';

function flattenMenus(menus: MenuNode[]): MenuNode[] {
  return menus.flatMap(menu => [
    menu,
    ...(menu.children?.length ? flattenMenus(menu.children) : []),
  ]);
}

export default function AppRoutes() {
  const { menus, isAuthReady } = useAuth();

  if (!isAuthReady) return null;

  const flatMenus = flattenMenus(menus);

  return (
    <Routes>
      {flatMenus.map(menu => {
        if (!menu.path) return null;

        const Component = routeMap[menu.id];

        if (!Component) {
          console.warn(`routeMap에 없는 메뉴: ${menu.id}`);
          return null;
        }

        return (
          <Route
            key={menu.id}
            path={menu.path}
            element={
              <ProtectedRoute menuId={menu.id}>
                <Component />
              </ProtectedRoute>
            }
          />
        );
      })}

      {/* 기본 홈 경로 */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 없는 경로 */}
      <Route path="*" element={<Navigate to="/403" replace />} />
    </Routes>
  );
}


// import { Routes, Route } from 'react-router-dom';
// import { useAuth } from '@/pages/auth/AuthProvider';
// import AppLayout from '@/layout/AppLayout';
// import LoginPage from '@/pages/auth/LoginPage';
// import HomeRedirect from '@/app/HomeRedirect';
// import { renderMenuRoutes } from './renderRoutes';

// export default function AppRoutes() {
//   const { menus, isAuthReady } = useAuth();

//   if (!isAuthReady) return null;

//   return (
//     <Routes>
//       <Route path="/login" element={<LoginPage />} />
//       <Route path="/" element={<HomeRedirect />} />

//       <Route element={<AppLayout />}>
//         {renderMenuRoutes(menus)}
//       </Route>
//     </Routes>
//   );
// }
