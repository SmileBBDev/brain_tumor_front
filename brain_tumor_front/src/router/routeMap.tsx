import type { ComponentType } from 'react';

import DashboardPage from '@/pages/dashboard/DashboardPage';
import PatientListPage from '@/pages/patient/PatientListPage';
import ImagingPage from '@/pages/imaging/ImagingPage';
import AISummaryPage from '@/pages/ai/AISummaryPage';
import RISWorklistPage from '@/pages/ris/RISWorklistPage';
import OrderListPage from '@/pages/orders/OrderListPage';
// import OrderCreatePage from '@/pages/orders/OrderCreate';
import ComingSoon from '@/pages/common/CommingSoon';
import { ComingSoonPage } from '@/pages/common/CommingSoon';
import PatientDetailPage from '@/pages/patient/PatientDetailPage';

// DB에서 호출된 메뉴명과 react 화면 컴포넌트 연결하는 곳(DB 메뉴 ↔ 화면 계약서)
export const routeMap: Record<string, ComponentType> = {
  DASHBOARD: DashboardPage,
  
  PATIENT_LIST: PatientListPage,
  PATIENT_DETAIL: PatientDetailPage,

  IMAGE_VIEWER: ImagingPage,
  AI_SUMMARY :AISummaryPage,
  ORDER_LIST: OrderListPage,
  ORDER_CREATE: ComingSoon,
  RIS_WORKLIST : RISWorklistPage,
  
  LAB_RESULT_VIEW: () => <ComingSoonPage title="검사 결과 조회" />,
  LAB_RESULT_UPLOAD: () => <ComingSoonPage title="검사 결과 업로드" />,

  ADMIN_USER: () => <ComingSoonPage title="사용자 관리" />,
  ADMIN_ROLE: () => <ComingSoonPage title="역할 관리" />,
  ADMIN_MENU_PERMISSION: () => <ComingSoonPage title="메뉴 권한" />,
  ADMIN_AUDIT_LOG: () => <ComingSoonPage title="감사 로그" />,
  ADMIN_SYSTEM_MONITOR: () => <ComingSoonPage title="시스템 모니터" />,
};