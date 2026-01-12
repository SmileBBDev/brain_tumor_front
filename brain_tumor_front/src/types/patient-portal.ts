/**
 * Patient Portal Types
 * - 환자 본인 포털용 타입 정의
 */

// 환자 본인 정보
export interface MyPatientInfo {
  id: number;
  patient_number: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  birth_date: string;
  blood_type?: string;
  phone?: string;
  allergies: string[];
  chronic_diseases: string[];
  registered_at: string;
}

// 환자 진료 이력
export interface MyEncounter {
  id: number;
  encounter_type_display: string;
  status_display: string;
  attending_doctor_name: string;
  department_display?: string;
  encounter_date: string;
  chief_complaint?: string;
  primary_diagnosis?: string;
}

// 환자 검사 결과
export interface MyOCSResult {
  ris: MyOCSItem[];
  lis: MyOCSItem[];
}

export interface MyOCSItem {
  id: number;
  job_type: string;
  ocs_status_display: string;
  created_at: string;
  result_summary?: string;
}

// 환자 주의사항
export interface MyAlert {
  id: number;
  alert_type: string;
  alert_type_display: string;
  severity: string;
  severity_display: string;
  title: string;
  description?: string;
  is_active: boolean;
}
