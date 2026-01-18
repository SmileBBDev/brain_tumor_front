import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MGResultViewer from '@/components/MGResultViewer'
import { SurvivalChart } from '@/components/ai/SurvivalChart'
import { GeneBarChart } from '@/components/ai/GeneBarChart'
import { GeneHeatmap } from '@/components/ai/GeneHeatmap'
import { aiApi } from '@/services/ai.api'
import { useThumbnailCache } from '@/context/ThumbnailCacheContext'
import './MGDetailPage.css'

interface MGResult {
  patient_id?: string
  survival_risk?: {
    risk_score: number
    risk_percentile?: number
    risk_category?: string
    model_cindex?: number
  }
  survival_time?: {
    predicted_days: number
    predicted_months: number
    confidence_interval?: { lower: number; upper: number }
  }
  grade?: {
    predicted_class: string
    probability: number
    lgg_probability?: number
    hgg_probability?: number
    probabilities?: Record<string, number>
  }
  recurrence?: {
    predicted_class: string
    probability: number
    recurrence_probability?: number
  }
  tmz_response?: {
    predicted_class: string
    probability: number
    responder_probability?: number
  }
  xai?: {
    attention_weights?: number[]
    top_genes?: Array<{
      rank: number
      gene: string
      attention_score: number
      expression_zscore: number
    }>
    gene_importance_summary?: {
      total_genes: number
      attention_mean: number
      attention_std: number
      attention_max: number
      attention_min: number
    }
  }
  processing_time_ms?: number
  input_genes_count?: number
  model_version?: string
}

interface InferenceDetail {
  id: number
  job_id: string
  model_type: string
  status: string
  mode: string
  patient_name: string
  patient_number: string
  gene_ocs: number | null
  result_data: MGResult | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export default function MGDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { markAsCached } = useThumbnailCache()

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [inferenceDetail, setInferenceDetail] = useState<InferenceDetail | null>(null)

  // 생존 곡선 데이터 생성 (샘플 데이터 - 실제 API 연동 시 교체)
  const survivalChartData = useMemo(() => {
    if (!inferenceDetail?.result_data?.survival_risk) return []

    // Kaplan-Meier 스타일 생존 곡선 샘플 데이터
    const timePoints = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60]
    return timePoints.map(time => ({
      time,
      low: Math.max(0, 1 - (time / 100) * 0.8),
      medium: Math.max(0, 1 - (time / 80) * 0.9),
      high: Math.max(0, 1 - (time / 60) * 1.0),
    }))
  }, [inferenceDetail?.result_data?.survival_risk])

  // 환자 위험군 결정
  const patientRiskGroup = useMemo((): 'high' | 'medium' | 'low' | undefined => {
    const riskScore = inferenceDetail?.result_data?.survival_risk?.risk_score
    if (riskScore === undefined) return undefined
    if (riskScore < 0.33) return 'low'
    if (riskScore < 0.66) return 'medium'
    return 'high'
  }, [inferenceDetail?.result_data?.survival_risk?.risk_score])

  // 유전자 중요도 데이터 변환
  const geneBarChartData = useMemo(() => {
    const topGenes = inferenceDetail?.result_data?.xai?.top_genes
    if (!topGenes) return []

    return topGenes.slice(0, 15).map(gene => ({
      name: gene.gene,
      importance: gene.attention_score,
      direction: gene.expression_zscore >= 0 ? 'up' as const : 'down' as const,
      expressionZscore: gene.expression_zscore,
    }))
  }, [inferenceDetail?.result_data?.xai?.top_genes])

  // 히트맵 데이터 생성 (샘플 데이터 - 실제 API 연동 시 교체)
  const heatmapData = useMemo(() => {
    const topGenes = inferenceDetail?.result_data?.xai?.top_genes
    if (!topGenes || topGenes.length === 0) return { genes: [], samples: [], values: [] }

    const genes = topGenes.slice(0, 20).map(g => g.gene)
    const samples = ['Sample1', 'Sample2', 'Sample3', 'Sample4', 'Sample5', 'Patient']

    // 시드 기반 pseudo-random 생성 (일관된 데모 데이터)
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000
      return x - Math.floor(x)
    }

    // 샘플 발현량 데이터 생성 (실제 데이터로 교체 필요)
    const values = genes.map((_, gIdx) =>
      samples.map((_, sIdx) => {
        if (sIdx === samples.length - 1) {
          // 환자 데이터는 실제 z-score 사용
          return topGenes[gIdx]?.expression_zscore / 3 || 0
        }
        // 다른 샘플은 시드 기반 데모 데이터 (일관성 유지)
        return (seededRandom(gIdx * 100 + sIdx) - 0.5) * 2
      })
    )

    return { genes, samples, values }
  }, [inferenceDetail?.result_data?.xai?.top_genes])

  // 데이터 로드
  useEffect(() => {
    if (jobId) {
      loadInferenceDetail(jobId)
      // 보고서 방문 시 캐시에 등록 (목록 페이지에서 썸네일 표시용)
      markAsCached(`ai_${jobId}`)
    }
  }, [jobId, markAsCached])

  const loadInferenceDetail = async (id: string) => {
    try {
      setLoading(true)
      setError('')
      const data = await aiApi.getInferenceDetail(id)
      setInferenceDetail(data)
    } catch (err: any) {
      console.error('Failed to load inference detail:', err)
      setError(err.response?.data?.error || '추론 결과를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/ai/mg')
  }

  const handleDelete = async () => {
    if (!jobId || !window.confirm('이 추론 결과를 삭제하시겠습니까?')) {
      return
    }

    try {
      await aiApi.deleteInference(jobId)
      navigate('/ai/mg')
    } catch (err: any) {
      console.error('Failed to delete inference:', err)
      alert(err.response?.data?.error || '삭제에 실패했습니다.')
    }
  }

  // PDF 출력
  const handleExportPDF = async () => {
    if (!inferenceDetail || !inferenceDetail.result_data) {
      alert('출력할 데이터가 없습니다.')
      return
    }

    try {
      const { generateMGReportPDF } = await import('@/utils/exportUtils')
      await generateMGReportPDF({
        jobId: inferenceDetail.job_id,
        patientName: inferenceDetail.patient_name,
        patientNumber: inferenceDetail.patient_number,
        createdAt: new Date(inferenceDetail.created_at).toLocaleString('ko-KR'),
        completedAt: inferenceDetail.completed_at ? new Date(inferenceDetail.completed_at).toLocaleString('ko-KR') : undefined,
        grade: inferenceDetail.result_data.grade,
        survival_risk: inferenceDetail.result_data.survival_risk,
        survival_time: inferenceDetail.result_data.survival_time,
        recurrence: inferenceDetail.result_data.recurrence,
        tmz_response: inferenceDetail.result_data.tmz_response,
        top_genes: inferenceDetail.result_data.xai?.top_genes,
        processing_time_ms: inferenceDetail.result_data.processing_time_ms,
        input_genes_count: inferenceDetail.result_data.input_genes_count,
      })
    } catch (err) {
      console.error('PDF 출력 실패:', err)
      alert('PDF 출력에 실패했습니다.')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { className: string; label: string }> = {
      COMPLETED: { className: 'status-badge status-completed', label: '완료' },
      PROCESSING: { className: 'status-badge status-processing', label: '처리중' },
      PENDING: { className: 'status-badge status-pending', label: '대기' },
      FAILED: { className: 'status-badge status-failed', label: '실패' },
    }
    const { className, label } = statusMap[status] || { className: 'status-badge status-pending', label: status }
    return <span className={className}>{label}</span>
  }

  if (loading) {
    return (
      <div className="mg-detail-page">
        <div className="loading-container">
          <div className="spinner mg" />
          <p className="loading-text">데이터 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mg-detail-page">
        <div className="error-container">
          <h4 className="error-title">오류 발생</h4>
          <p className="error-message">{error}</p>
          <button onClick={handleBack} className="btn-back">
            목록으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (!inferenceDetail) {
    return (
      <div className="mg-detail-page">
        <div className="error-container">
          <h4 className="error-title">결과를 찾을 수 없습니다</h4>
          <button onClick={handleBack} className="btn-back">
            목록으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mg-detail-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button onClick={handleBack} className="btn-back-icon">
            ← 뒤로
          </button>
          <div>
            <h2 className="page-title">MG 분석 결과 상세</h2>
            <p className="page-subtitle">Job ID: {jobId}</p>
          </div>
        </div>
        <div className="header-actions">
          {inferenceDetail.status === 'COMPLETED' && (
            <button onClick={handleExportPDF} className="btn-pdf">
              PDF 출력
            </button>
          )}
          <button onClick={handleDelete} className="btn-delete">
            삭제
          </button>
        </div>
      </div>

      {/* Job Info */}
      <div className="info-section">
        <div className="info-grid">
          <div className="info-card">
            <h4 className="card-title">요청 정보</h4>
            <dl className="info-list">
              <div className="info-item">
                <dt>Job ID</dt>
                <dd>{inferenceDetail.job_id}</dd>
              </div>
              <div className="info-item">
                <dt>상태</dt>
                <dd>{getStatusBadge(inferenceDetail.status)}</dd>
              </div>
              <div className="info-item">
                <dt>모드</dt>
                <dd>{inferenceDetail.mode === 'auto' ? '자동' : '수동'}</dd>
              </div>
              <div className="info-item">
                <dt>요청일</dt>
                <dd>{new Date(inferenceDetail.created_at).toLocaleString('ko-KR')}</dd>
              </div>
              {inferenceDetail.completed_at && (
                <div className="info-item">
                  <dt>완료일</dt>
                  <dd>{new Date(inferenceDetail.completed_at).toLocaleString('ko-KR')}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="info-card">
            <h4 className="card-title">환자 정보</h4>
            <dl className="info-list">
              <div className="info-item">
                <dt>환자명</dt>
                <dd>{inferenceDetail.patient_name || '-'}</dd>
              </div>
              <div className="info-item">
                <dt>환자번호</dt>
                <dd>{inferenceDetail.patient_number || '-'}</dd>
              </div>
              <div className="info-item">
                <dt>OCS ID</dt>
                <dd>{inferenceDetail.gene_ocs || '-'}</dd>
              </div>
            </dl>
          </div>
          {inferenceDetail.result_data && (
            <div className="info-card">
              <h4 className="card-title">처리 정보</h4>
              <dl className="info-list">
                {inferenceDetail.result_data.processing_time_ms && (
                  <div className="info-item">
                    <dt>처리 시간</dt>
                    <dd className="processing-time mg">
                      {(inferenceDetail.result_data.processing_time_ms / 1000).toFixed(2)}초
                    </dd>
                  </div>
                )}
                {inferenceDetail.result_data.input_genes_count && (
                  <div className="info-item">
                    <dt>입력 유전자 수</dt>
                    <dd>{inferenceDetail.result_data.input_genes_count.toLocaleString()}개</dd>
                  </div>
                )}
                {inferenceDetail.result_data.model_version && (
                  <div className="info-item">
                    <dt>모델 버전</dt>
                    <dd>{inferenceDetail.result_data.model_version}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* MG Result Viewer */}
      {inferenceDetail.status === 'COMPLETED' && inferenceDetail.result_data && (
        <div className="section">
          <h3 className="section-title">분석 결과</h3>
          <MGResultViewer result={inferenceDetail.result_data} />
        </div>
      )}

      {/* 시각화 섹션 - 생존 곡선 + 유전자 중요도 */}
      {inferenceDetail.status === 'COMPLETED' && inferenceDetail.result_data && (
        <div className="section">
          <h3 className="section-title">시각화 분석</h3>
          <div className="visualization-grid">
            {/* 생존 곡선 차트 */}
            {survivalChartData.length > 0 && (
              <SurvivalChart
                data={survivalChartData}
                patientRiskGroup={patientRiskGroup}
                patientSurvivalMonths={inferenceDetail.result_data.survival_time?.predicted_months}
                medianSurvival={{ high: 14, medium: 28, low: 48 }}
                height={320}
              />
            )}

            {/* 유전자 중요도 바 차트 */}
            {geneBarChartData.length > 0 && (
              <GeneBarChart
                data={geneBarChartData}
                maxGenes={10}
                title="Top 10 유전자 중요도 (Attention)"
                showDirection={true}
              />
            )}
          </div>
        </div>
      )}

      {/* 유전자 히트맵 */}
      {inferenceDetail.status === 'COMPLETED' &&
        heatmapData.genes.length > 0 && (
          <div className="section">
            <h3 className="section-title">유전자 발현 히트맵</h3>
            <GeneHeatmap
              genes={heatmapData.genes}
              samples={heatmapData.samples}
              values={heatmapData.values}
              cellSize={22}
              maxGenes={20}
              maxSamples={10}
            />
          </div>
        )}

      {/* Error Message */}
      {inferenceDetail.status === 'FAILED' && inferenceDetail.error_message && (
        <div className="section">
          <h3 className="section-title">오류 정보</h3>
          <div className="error-container">
            <p className="error-message">{inferenceDetail.error_message}</p>
          </div>
        </div>
      )}

      {/* XAI Top Genes */}
      {inferenceDetail.result_data?.xai?.top_genes && (
        <div className="section">
          <h3 className="section-title">주요 유전자 (Top Genes)</h3>
          <div className="top-genes-card">
            <table className="top-genes-table">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>유전자</th>
                  <th>Attention Score</th>
                  <th>Expression Z-Score</th>
                </tr>
              </thead>
              <tbody>
                {inferenceDetail.result_data.xai.top_genes.slice(0, 20).map((gene) => (
                  <tr key={gene.rank}>
                    <td>{gene.rank}</td>
                    <td className="gene-name">{gene.gene}</td>
                    <td>
                      <div className="score-bar-container">
                        <div
                          className="score-bar attention"
                          style={{ width: `${gene.attention_score * 100}%` }}
                        />
                        <span className="score-value">{gene.attention_score.toFixed(4)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`zscore ${gene.expression_zscore > 0 ? 'positive' : 'negative'}`}>
                        {gene.expression_zscore > 0 ? '+' : ''}{gene.expression_zscore.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
