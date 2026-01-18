import { api } from './api';

// PDF 워터마크 설정 타입
export type PdfWatermarkConfig = {
  enabled: boolean;              // 활성화 여부
  text: string;                  // 워터마크 텍스트
  position: 'center' | 'diagonal' | 'top-right' | 'bottom-right';
  opacity: number;               // 투명도 (0.0 ~ 1.0)
  fontSize: number;              // 글꼴 크기 (px)
  color: string;                 // 색상 (hex)
  rotation: number;              // 회전 각도 (degree)
  repeatPattern: boolean;        // 패턴 반복 여부
};

// 기본 설정값
export const DEFAULT_PDF_WATERMARK_CONFIG: PdfWatermarkConfig = {
  enabled: false,
  text: 'CONFIDENTIAL',
  position: 'diagonal',
  opacity: 0.15,
  fontSize: 48,
  color: '#cccccc',
  rotation: -45,
  repeatPattern: false,
};

/**
 * PDF 워터마크 설정 조회
 */
export const getPdfWatermarkConfig = async (): Promise<PdfWatermarkConfig> => {
  const response = await api.get('/system/config/pdf-watermark/');
  return response.data;
};

/**
 * PDF 워터마크 설정 수정
 */
export const updatePdfWatermarkConfig = async (config: PdfWatermarkConfig): Promise<void> => {
  await api.put('/system/config/pdf-watermark/', config);
};
