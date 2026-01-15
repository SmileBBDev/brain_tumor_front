/**
 * AI 추론 요청 페이지
 * - "새 분석 요청" 버튼 클릭 시 AI 분석 팝업 열림
 */
import { useState } from 'react'
import { AIAnalysisPopup } from '@/components/AIAnalysisPopup'
import './AIRequestCreatePage.css'

export default function AIRequestCreatePage() {
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  return (
    <div className="ai-request-page">
      {/* 헤더 */}
      <div className="ai-request-header">
        <div className="ai-request-header-content">
          <h1 className="ai-request-title">AI 분석 요청</h1>
          <p className="ai-request-subtitle">
            뇌종양 MRI 영상, 유전자 발현, 멀티모달 데이터를 AI로 분석합니다.
          </p>
        </div>
        <button
          className="btn btn-primary ai-new-request-btn"
          onClick={() => setIsPopupOpen(true)}
        >
          + 새 분석 요청
        </button>
      </div>

      {/* 분석 유형 카드 */}
      <div className="ai-request-cards">
        <div className="ai-request-card" onClick={() => setIsPopupOpen(true)}>
          <div className="ai-card-icon">🧠</div>
          <h3 className="ai-card-title">M1 MRI 분석</h3>
          <p className="ai-card-description">
            MRI 영상을 분석하여 종양 등급(Grade), IDH 돌연변이, MGMT 메틸화, 생존 예측을 수행합니다.
          </p>
          <span className="ai-card-action">분석 시작 →</span>
        </div>

        <div className="ai-request-card" onClick={() => setIsPopupOpen(true)}>
          <div className="ai-card-icon">🧬</div>
          <h3 className="ai-card-title">MG Gene Analysis</h3>
          <p className="ai-card-description">
            유전자 발현 데이터를 분석하여 분자적 특성과 예후를 예측합니다.
          </p>
          <span className="ai-card-action">분석 시작 →</span>
        </div>

        <div className="ai-request-card" onClick={() => setIsPopupOpen(true)}>
          <div className="ai-card-icon">🔬</div>
          <h3 className="ai-card-title">MM 멀티모달</h3>
          <p className="ai-card-description">
            MRI 영상과 유전자 데이터를 통합하여 종합적인 분석을 수행합니다.
          </p>
          <span className="ai-card-action">분석 시작 →</span>
        </div>
      </div>

      {/* AI 분석 팝업 */}
      <AIAnalysisPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
      />
    </div>
  )
}
