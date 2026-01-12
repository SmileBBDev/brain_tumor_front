/**
 * Patient Portal API Service
 * - 환자 본인 정보 조회 (PATIENT 역할 전용)
 */
import { api } from './api';
import type {
  MyPatientInfo,
  MyEncounter,
  MyOCSResult,
  MyAlert,
} from '@/types/patient-portal';

// 배열 또는 paginated 응답을 배열로 정규화
type ListResponse<T> = T[] | { results: T[]; count?: number };
const normalizeList = <T>(data: ListResponse<T>): T[] => {
  return Array.isArray(data) ? data : data?.results || [];
};

/**
 * 환자 본인 정보 조회
 * GET /api/patients/me/
 */
export const getMyPatientInfo = async (): Promise<MyPatientInfo> => {
  const response = await api.get<MyPatientInfo>('/patients/me/');
  return response.data;
};

/**
 * 환자 본인 진료 이력 조회
 * GET /api/patients/me/encounters/
 */
export const getMyEncounters = async (): Promise<MyEncounter[]> => {
  const response = await api.get<ListResponse<MyEncounter>>('/patients/me/encounters/');
  return normalizeList(response.data);
};

/**
 * 환자 본인 검사 결과 조회
 * GET /api/patients/me/ocs/
 */
export const getMyOCS = async (): Promise<MyOCSResult> => {
  const response = await api.get<MyOCSResult>('/patients/me/ocs/');
  return response.data;
};

/**
 * 환자 본인 주의사항 조회
 * GET /api/patients/me/alerts/
 */
export const getMyAlerts = async (): Promise<MyAlert[]> => {
  const response = await api.get<ListResponse<MyAlert>>('/patients/me/alerts/');
  return normalizeList(response.data);
};
