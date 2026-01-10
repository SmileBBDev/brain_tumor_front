import { api } from './api';
import type {
  Patient,
  PatientListResponse,
  PatientSearchParams,
  PatientCreateData,
  PatientUpdateData,
  PatientStatistics,
} from '@/types/patient';

/**
 * Patient API Service
 */

// Get patient list with pagination and filters
export const getPatients = async (params?: PatientSearchParams): Promise<PatientListResponse> => {
  const response = await api.get<PatientListResponse>('/patients/', { params });
  return response.data;
};

// Get patient detail
export const getPatient = async (patientId: number): Promise<Patient> => {
  const response = await api.get<Patient>(`/patients/${patientId}/`);
  return response.data;
};

// Create new patient
export const createPatient = async (data: PatientCreateData): Promise<Patient> => {
  const response = await api.post<Patient>('/patients/', data);
  return response.data;
};

// Update patient
export const updatePatient = async (
  patientId: number,
  data: PatientUpdateData
): Promise<Patient> => {
  const response = await api.put<Patient>(`/patients/${patientId}/`, data);
  return response.data;
};

// Delete patient (soft delete)
export const deletePatient = async (patientId: number): Promise<void> => {
  await api.delete(`/patients/${patientId}/`);
};

// Search patients (autocomplete)
export const searchPatients = async (params: { q?: string; id?: number }): Promise<Patient[]> => {
  const response = await api.get<Patient[]>('/patients/search/', { params });
  return response.data;
};

// Get patient statistics
export const getPatientStatistics = async (): Promise<PatientStatistics> => {
  const response = await api.get<PatientStatistics>('/patients/statistics/');
  return response.data;
};

// =============================================================================
// 외부 환자 등록 API
// =============================================================================

// 외부 환자 생성 요청 타입
export interface CreateExternalPatientRequest {
  name: string;
  birth_date: string;  // YYYY-MM-DD
  gender: 'M' | 'F' | 'O';
  phone?: string;
  address?: string;
  institution_name?: string;
  external_patient_id?: string;
}

// 외부 환자 생성 응답 타입
export interface CreateExternalPatientResponse {
  message: string;
  patient: Patient;
}

// 외부 환자 등록 (EXTR_XXXX 형식)
export const createExternalPatient = async (
  data: CreateExternalPatientRequest
): Promise<CreateExternalPatientResponse> => {
  const response = await api.post<CreateExternalPatientResponse>(
    '/patients/create_external/',
    data
  );
  return response.data;
};
