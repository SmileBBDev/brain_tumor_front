import { useState } from 'react';
import { MENU_CONFIG } from '@/config/menuConfig';
import type { MenuId } from '@/types/menu';
import type { Role } from '@/types/role';
import type{ MenuConfig } from '@/config/menuConfig';
import SidebarItem from '@/layout/SidebarItem';
import '@/assets/style/sidebarStyle.css'

interface Props {
  role: Role;
}
export default function Sidebar( { role } : Props) {
  const menus: MenuId[] = JSON.parse(
    localStorage.getItem('menus') || '[]'
  );

  const isSystemManager = role === 'SYSTEMMANAGER';

  /** 권한 체크 */
  const hasMenu = (menuId: MenuId) => {
    return menus.includes(menuId);
  };

  const canAccess = (menu: MenuConfig): boolean => {
    if (isSystemManager) return true;

    // leaf
    if (menu.path) {
      // breadcrumb-only 메뉴는 sidebar에 안 나옴
      if (menu.breadcrumbOnly) return false;
      return menu.roles.includes(role) && hasMenu(menu.id);
    }

    // group → children 중 하나라도 접근 가능하면 노출
    return (
      menu.children?.some(child => canAccess(child)) ?? false
    );
  };

  // 현재 열려있는 그룹 id 상태 관리
  const [openGroup, setOpenGroup] = useState<MenuId | null>(null);

  const handleToggle = (menuId : MenuId) => {
    setOpenGroup(prev => (prev === menuId ? null : menuId));
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul className="menu-list">
          {MENU_CONFIG.map(menu => (
            <SidebarItem
              key={menu.id}
              menu={menu}
              role={role}
              canAccess={canAccess}
              isOpen = {openGroup === menu.id}
              onToggle={()=> handleToggle(menu.id)}
            />
          ))}
        </ul>
      </nav>
    </aside>
  );
}