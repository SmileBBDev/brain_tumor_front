import { api } from './api';
import type {
  Prescription,
  PrescriptionListItem,
  PrescriptionListResponse,
  PrescriptionSearchParams,
  PrescriptionCreateData,
  PrescriptionUpdateData,
  PrescriptionCancelData,
  PrescriptionIssueResponse,
  PrescriptionItem,
  PrescriptionItemCreateData,
} from '@/types/prescription';

/**
 * 처방 (Prescription) API Service
 */

// =============================================================================
// 기본 CRUD
// =============================================================================

// 처방 목록 조회
export const getPrescriptionList = async (
  params?: PrescriptionSearchParams
): Promise<PrescriptionListResponse> => {
  const response = await api.get<PrescriptionListResponse>('/prescriptions/', { params });
  return response.data;
};

// 처방 목록 조회 (배열 형태로 반환)
export const getPrescriptions = async (
  params?: PrescriptionSearchParams
): Promise<PrescriptionListItem[]> => {
  const response = await api.get<PrescriptionListResponse>('/prescriptions/', { params });
  return response.data.results;
};

// 환자별 처방 목록 조회 (편의 함수)
export const getPrescriptionsByPatient = async (
  patientId: number
): Promise<PrescriptionListItem[]> => {
  return getPrescriptions({ patient_id: patientId });
};

// 처방 상세 조회
export const getPrescription = async (prescriptionId: number): Promise<Prescription> => {
  const response = await api.get<Prescription>(`/prescriptions/${prescriptionId}/`);
  return response.data;
};

// 처방 생성
export const createPrescription = async (
  data: PrescriptionCreateData
): Promise<Prescription> => {
  const response = await api.post<Prescription>('/prescriptions/', data);
  return response.data;
};

// 처방 수정
export const updatePrescription = async (
  prescriptionId: number,
  data: PrescriptionUpdateData
): Promise<Prescription> => {
  const response = await api.patch<Prescription>(`/prescriptions/${prescriptionId}/`, data);
  return response.data;
};

// 처방 삭제
export const deletePrescription = async (prescriptionId: number): Promise<void> => {
  await api.delete(`/prescriptions/${prescriptionId}/`);
};

// =============================================================================
// 상태 변경 API
// =============================================================================

// 처방전 발행 (DRAFT → ISSUED)
export const issuePrescription = async (
  prescriptionId: number
): Promise<PrescriptionIssueResponse> => {
  const response = await api.post<PrescriptionIssueResponse>(
    `/prescriptions/${prescriptionId}/issue/`
  );
  return response.data;
};

// 처방전 취소
export const cancelPrescription = async (
  prescriptionId: number,
  data: PrescriptionCancelData
): Promise<PrescriptionIssueResponse> => {
  const response = await api.post<PrescriptionIssueResponse>(
    `/prescriptions/${prescriptionId}/cancel/`,
    data
  );
  return response.data;
};

// 처방전 조제 완료 (ISSUED → DISPENSED)
export const dispensePrescription = async (
  prescriptionId: number
): Promise<PrescriptionIssueResponse> => {
  const response = await api.post<PrescriptionIssueResponse>(
    `/prescriptions/${prescriptionId}/dispense/`
  );
  return response.data;
};

// =============================================================================
// 처방 항목 API
// =============================================================================

// 처방 항목 추가
export const addPrescriptionItem = async (
  prescriptionId: number,
  data: PrescriptionItemCreateData
): Promise<PrescriptionItem> => {
  const response = await api.post<PrescriptionItem>(
    `/prescriptions/${prescriptionId}/items/`,
    data
  );
  return response.data;
};

// 처방 항목 삭제
export const removePrescriptionItem = async (
  prescriptionId: number,
  itemId: number
): Promise<void> => {
  await api.delete(`/prescriptions/${prescriptionId}/items/${itemId}/`);
};
