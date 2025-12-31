// import { useLocation } from 'react-router-dom';
// import type{ MenuNode } from '@/types/menu';
// import { useAuth } from '@/pages/auth/AuthProvider';

// interface BreadcrumbItem {
//     id : string;
//     label : string;
//     path? : string;
// }

// function findBreadcrumbPath(
//     menus : MenuNode[],
//     pathname : string,
//     role : string | null,
//     parents : BreadcrumbItem[] = [],
// ): BreadcrumbItem[] | null {
//     for (const menu of menus){

//         let matched = false;
//         let params: Record<string, string> = {};

//         // path가 있을 때 매칭 시도
//         if(menu.path) {
//             const result = matchPathPattern(
//                 menu.path,
//                 pathname,
//             );
//             matched = result.matched;
//             params = result.params;
//         }

//         if(!matched && !menu.children) continue;
        
//         // ❗ path 없는 메뉴 (group)는 breadcrumb에서 제외
//         if (!menu.path && menu.children) {
//             // 단, children 탐색은 계속해야 함
//             const childResult = findBreadcrumbPath(
//                 menu.children,
//                 pathname,
//                 role,
//                 parents // ← 여기 중요 (group 안 넣음)
//             );
//             if (childResult) return childResult;
//             continue;
//         }

//         const roleKey = role ?? 'DEFAULT';
//         const current: BreadcrumbItem = {
//             id: menu.id,
//             label:
//                 menu.labels?.[roleKey] ??
//                 menu.labels?.['DEFAULT'] ??
//                 menu.id,
//             path: menu.breadcrumbOnly ? undefined : menu.path,
//         };

//         // children이 있는 경우 재귀 탐색
//         if (menu.children) {
//             const childResult = findBreadcrumbPath(
//                 menu.children,
//                 pathname,
//                 role,
//                 current ? [...parents, current] : parents
//             );
//             if (childResult) return childResult;
//         }

//         // leaf match
//         if (matched && current) {
//             return [...parents, current];
//         }

                
//     };

//     return null;
// }

// function matchPathPattern(
//   pattern: string,
//   pathname: string
// ): { matched: boolean; params: Record<string, string> } {
//     const paramNames: string[] = [];

//     const regexPath = pattern.replace(
//     /:([^/]+)/g,
//     (_, key) => {
//         paramNames.push(key);
//         return '([^/]+)';
//     }
//     );

//     const regex = new RegExp(`^${regexPath}`);

//     const match = pathname.match(regex);

//     if (!match) return { matched: false, params: {} };

//     const params = paramNames.reduce((acc, key, idx) => {
//     acc[key] = match[idx + 1];
//     return acc;
//     }, {} as Record<string, string>);

//     return { matched: true, params };
// }


// export default function useBreadcrumb(
//     menus: MenuNode[],
//     role: string | null
// ){
    
//     const location = useLocation();

//     const breadcrumb = findBreadcrumbPath(
//         menus,
//         location.pathname,
//         role
//     )?? [];
    

//     return breadcrumb;
// }

import { useLocation } from 'react-router-dom';
import type { MenuNode } from '@/types/menu';

interface BreadcrumbItem {
  id: string;
  label: string;
  path?: string;
}

function findBreadcrumbPath(
  menus: MenuNode[],
  pathname: string,
  role: string,
  parents: BreadcrumbItem[] = []
): BreadcrumbItem[] | null {
  for (const menu of menus) {
    let matched = false;

    // path 매칭
    if (menu.path) {
      matched = pathname.startsWith(menu.path);
    }

    // group 메뉴 (path 없음) → breadcrumb에는 안 넣고 children만 탐색
    if (!menu.path && menu.children) {
      const child = findBreadcrumbPath(
        menu.children,
        pathname,
        role,
        parents
      );
      if (child) return child;
      continue;
    }

    const label =
      menu.labels?.[role] ??
      menu.labels?.['DEFAULT'] ??
      menu.id;

    const current: BreadcrumbItem = {
      id: menu.id,
      label,
      path: menu.breadcrumbOnly ? undefined : menu.path,
    };

    // children 먼저 탐색
    if (menu.children) {
      const child = findBreadcrumbPath(
        menu.children,
        pathname,
        role,
        [...parents, current]
      );
      if (child) return child;
    }

    // leaf match
    if (matched) {
      return [...parents, current];
    }
  }

  return null;
}

/**
 * ✅ 최종 useBreadcrumb
 */
export default function useBreadcrumb(
  menus: MenuNode[] | undefined,
  role: string | null
) {
  const location = useLocation();

  // 🔥 가장 중요: 방어 코드
  if (!menus || !Array.isArray(menus)) return [];
  if (!role) return [];

  const breadcrumb =
    findBreadcrumbPath(menus, location.pathname, role) ?? [];

  return breadcrumb;
}
