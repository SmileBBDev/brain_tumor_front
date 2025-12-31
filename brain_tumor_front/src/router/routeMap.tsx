import type { ComponentType } from 'react';

import DashboardPage from '@/pages/dashboard/DashboardPage';
import PatientListPage from '@/pages/patient/PatientListPage';
import ImagingPage from '@/pages/imaging/ImagingPage';
import AISummaryPage from '@/pages/ai/AISummaryPage';
import RISWorklistPage from '@/pages/ris/RISWorklistPage';


export const routeMap: Record<string, ComponentType> = {
  DASHBOARD: DashboardPage,
  PATIENT_LIST: PatientListPage,
  IMAGE_VIEWER: ImagingPage,
  AI :AISummaryPage,
  RISWORK : RISWorklistPage,
};