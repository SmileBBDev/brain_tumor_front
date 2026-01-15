/**
 * AI 분석 블록 컴포넌트
 * - 대시보드에 인라인으로 표시되는 AI 분석 UI
 * - M1/MG/MM 탭 전환
 */
import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import './AIAnalysisBlock.css'

// ============================================================================
// Types
// ============================================================================
interface OCSItem {
  id: number
  ocs_id: string
  patient_name: string
  patient_number: string
  job_role: string
  job_type: string
  ocs_status: string
}

interface InferenceResult {
  grade?: { predicted_class: string; probability: number }
  idh?: { predicted_class: string }
  mgmt?: { predicted_class: string }
  survival?: { risk_score: number; risk_category: string }
  processing_time_ms?: number
}

type TabType = 'm1' | 'mg' | 'mm'

// ============================================================================
// Main Component
// ============================================================================
export default function AIAnalysisBlock() {
  const [activeTab, setActiveTab] = useState<TabType>('m1')

  return (
    <div className="ai-block">
      {/* Header */}
      <div className="ai-block-header">
        <div className="ai-block-title-wrap">
          <h3 className="ai-block-title">AI 뇌종양 분석</h3>
          <span className="ai-block-subtitle">Brain Tumor CDSS</span>
        </div>
        <div className="ai-block-tabs">
          <button
            className={`ai-block-tab ${activeTab === 'm1' ? 'active' : ''}`}
            onClick={() => setActiveTab('m1')}
          >
            🧠 M1 MRI
          </button>
          <button
            className={`ai-block-tab ${activeTab === 'mg' ? 'active' : ''}`}
            onClick={() => setActiveTab('mg')}
          >
            🧬 MG Gene
          </button>
          <button
            className={`ai-block-tab ${activeTab === 'mm' ? 'active' : ''}`}
            onClick={() => setActiveTab('mm')}
          >
            🔬 MM 멀티모달
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="ai-block-content">
        {activeTab === 'm1' && <M1Panel />}
        {activeTab === 'mg' && <MGPanel />}
        {activeTab === 'mm' && <MMPanel />}
      </div>
    </div>
  )
}

// ============================================================================
// M1 Panel
// ============================================================================
function M1Panel() {
  const [ocsList, setOcsList] = useState<OCSItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [inferring, setInferring] = useState(false)
  const [result, setResult] = useState<InferenceResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadOcsList()
  }, [])

  const loadOcsList = async () => {
    try {
      setLoading(true)
      const res = await api.get('/ocs/', {
        params: { job_role: 'RIS', job_type: 'MRI', ocs_status: 'CONFIRMED', page_size: 50 }
      })
      const data = res.data.results || res.data || []
      setOcsList(data.map((item: any) => ({
        id: item.id,
        ocs_id: item.ocs_id,
        patient_name: item.patient?.name || '',
        patient_number: item.patient?.patient_number || '',
        job_role: item.job_role,
        job_type: item.job_type,
        ocs_status: item.ocs_status
      })))
    } catch (err) {
      setError('OCS 목록 로딩 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleInference = async () => {
    if (!selectedId) return
    try {
      setInferring(true)
      setError('')
      setResult(null)
      const res = await api.post('/ai/m1/inference/', { ocs_id: selectedId, mode: 'manual' })
      if (res.data.cached && res.data.result) {
        setResult(res.data.result)
      } else {
        setTimeout(async () => {
          try {
            const detail = await api.get(`/ai/inferences/${res.data.job_id}/`)
            if (detail.data.status === 'COMPLETED') {
              setResult(detail.data.result_data)
            }
          } catch {}
          setInferring(false)
        }, 5000)
        return
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '추론 요청 실패')
    } finally {
      setInferring(false)
    }
  }

  return (
    <div className="ai-panel">
      <p className="ai-panel-desc">MRI 영상 → Grade, IDH, MGMT, 생존 예측</p>

      <div className="ai-panel-body">
        {/* OCS 선택 */}
        <div className="ai-panel-left">
          <div className="ai-section-title">RIS MRI 목록 ({ocsList.length})</div>
          {loading ? (
            <div className="ai-loading">로딩 중...</div>
          ) : (
            <div className="ai-table-container">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>OCS ID</th>
                    <th>환자명</th>
                    <th>환자번호</th>
                  </tr>
                </thead>
                <tbody>
                  {ocsList.map(ocs => (
                    <tr
                      key={ocs.id}
                      className={selectedId === ocs.id ? 'selected' : ''}
                      onClick={() => { setSelectedId(ocs.id); setResult(null); }}
                    >
                      <td>
                        <input type="radio" checked={selectedId === ocs.id} readOnly />
                      </td>
                      <td>{ocs.ocs_id}</td>
                      <td>{ocs.patient_name}</td>
                      <td>{ocs.patient_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            className="ai-btn primary"
            onClick={handleInference}
            disabled={!selectedId || inferring}
          >
            {inferring ? '추론 중...' : 'M1 추론 요청'}
          </button>
        </div>

        {/* 결과 */}
        <div className="ai-panel-right">
          <div className="ai-section-title">추론 결과</div>
          {error && <div className="ai-error">{error}</div>}
          {result ? (
            <div className="ai-result-grid">
              {result.grade && (
                <div className="ai-result-card blue">
                  <div className="ai-result-label">Grade</div>
                  <div className="ai-result-value">{result.grade.predicted_class}</div>
                  <div className="ai-result-sub">{(result.grade.probability * 100).toFixed(1)}%</div>
                </div>
              )}
              {result.idh && (
                <div className="ai-result-card green">
                  <div className="ai-result-label">IDH</div>
                  <div className="ai-result-value">{result.idh.predicted_class}</div>
                </div>
              )}
              {result.mgmt && (
                <div className="ai-result-card purple">
                  <div className="ai-result-label">MGMT</div>
                  <div className="ai-result-value">{result.mgmt.predicted_class}</div>
                </div>
              )}
              {result.survival && (
                <div className="ai-result-card orange">
                  <div className="ai-result-label">생존 위험</div>
                  <div className="ai-result-value">{result.survival.risk_category}</div>
                  <div className="ai-result-sub">{result.survival.risk_score.toFixed(3)}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="ai-no-result">OCS를 선택하고 추론을 요청하세요</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MG Panel
// ============================================================================
function MGPanel() {
  const [ocsList, setOcsList] = useState<OCSItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [inferring, setInferring] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadOcsList()
  }, [])

  const loadOcsList = async () => {
    try {
      setLoading(true)
      const res = await api.get('/ocs/', {
        params: { job_role: 'LIS', job_type: 'RNA_SEQ', ocs_status: 'CONFIRMED', page_size: 50 }
      })
      const data = res.data.results || res.data || []
      setOcsList(data.map((item: any) => ({
        id: item.id,
        ocs_id: item.ocs_id,
        patient_name: item.patient?.name || '',
        patient_number: item.patient?.patient_number || '',
        job_role: item.job_role,
        job_type: item.job_type,
        ocs_status: item.ocs_status
      })))
    } catch (err) {
      setError('OCS 목록 로딩 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleInference = async () => {
    if (!selectedId) return
    try {
      setInferring(true)
      setError('')
      setResult(null)
      const res = await api.post('/ai/mg/inference/', { ocs_id: selectedId, mode: 'manual' })
      if (res.data.cached && res.data.result) {
        setResult(res.data.result)
      } else {
        setTimeout(async () => {
          try {
            const detail = await api.get(`/ai/inferences/${res.data.job_id}/`)
            if (detail.data.status === 'COMPLETED') {
              setResult(detail.data.result_data)
            }
          } catch {}
          setInferring(false)
        }, 5000)
        return
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '추론 요청 실패')
    } finally {
      setInferring(false)
    }
  }

  return (
    <div className="ai-panel">
      <p className="ai-panel-desc">유전자 발현 데이터 분석</p>

      <div className="ai-panel-body">
        <div className="ai-panel-left">
          <div className="ai-section-title">LIS RNA_SEQ 목록 ({ocsList.length})</div>
          {loading ? (
            <div className="ai-loading">로딩 중...</div>
          ) : (
            <div className="ai-table-container">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>OCS ID</th>
                    <th>환자명</th>
                    <th>환자번호</th>
                  </tr>
                </thead>
                <tbody>
                  {ocsList.map(ocs => (
                    <tr
                      key={ocs.id}
                      className={selectedId === ocs.id ? 'selected' : ''}
                      onClick={() => { setSelectedId(ocs.id); setResult(null); }}
                    >
                      <td>
                        <input type="radio" checked={selectedId === ocs.id} readOnly />
                      </td>
                      <td>{ocs.ocs_id}</td>
                      <td>{ocs.patient_name}</td>
                      <td>{ocs.patient_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            className="ai-btn primary purple"
            onClick={handleInference}
            disabled={!selectedId || inferring}
          >
            {inferring ? '추론 중...' : 'MG 추론 요청'}
          </button>
        </div>

        <div className="ai-panel-right">
          <div className="ai-section-title">추론 결과</div>
          {error && <div className="ai-error">{error}</div>}
          {result ? (
            <pre className="ai-result-json">{JSON.stringify(result, null, 2)}</pre>
          ) : (
            <div className="ai-no-result">OCS를 선택하고 추론을 요청하세요</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MM Panel
// ============================================================================
function MMPanel() {
  const [mriList, setMriList] = useState<OCSItem[]>([])
  const [geneList, setGeneList] = useState<OCSItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMri, setSelectedMri] = useState<number | null>(null)
  const [selectedGene, setSelectedGene] = useState<number | null>(null)
  const [inferring, setInferring] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [mriRes, geneRes] = await Promise.all([
        api.get('/ocs/', { params: { job_role: 'RIS', job_type: 'MRI', ocs_status: 'CONFIRMED', page_size: 50 } }),
        api.get('/ocs/', { params: { job_role: 'LIS', job_type: 'RNA_SEQ', ocs_status: 'CONFIRMED', page_size: 50 } })
      ])
      const mapOcs = (data: any) => (data.results || data || []).map((item: any) => ({
        id: item.id,
        ocs_id: item.ocs_id,
        patient_name: item.patient?.name || '',
        patient_number: item.patient?.patient_number || '',
        job_role: item.job_role,
        job_type: item.job_type,
        ocs_status: item.ocs_status
      }))
      setMriList(mapOcs(mriRes.data))
      setGeneList(mapOcs(geneRes.data))
    } catch (err) {
      setError('데이터 로딩 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleInference = async () => {
    if (!selectedMri && !selectedGene) {
      setError('MRI 또는 Gene 데이터를 선택하세요')
      return
    }
    try {
      setInferring(true)
      setError('')
      setResult(null)
      const res = await api.post('/ai/mm/inference/', {
        mri_ocs_id: selectedMri,
        gene_ocs_id: selectedGene,
        protein_ocs_id: null,
        mode: 'manual'
      })
      if (res.data.cached && res.data.result) {
        setResult(res.data.result)
      } else {
        setTimeout(async () => {
          try {
            const detail = await api.get(`/ai/inferences/${res.data.job_id}/`)
            if (detail.data.status === 'COMPLETED') {
              setResult(detail.data.result_data)
            }
          } catch {}
          setInferring(false)
        }, 5000)
        return
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '추론 요청 실패')
    } finally {
      setInferring(false)
    }
  }

  return (
    <div className="ai-panel">
      <p className="ai-panel-desc">MRI + 유전자 통합 분석</p>

      {loading ? (
        <div className="ai-loading">로딩 중...</div>
      ) : (
        <div className="ai-panel-body mm">
          {/* MRI 선택 */}
          <div className="ai-panel-col">
            <div className="ai-section-title">MRI ({mriList.length})</div>
            <div className="ai-table-container small">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>OCS ID</th>
                    <th>환자명</th>
                  </tr>
                </thead>
                <tbody>
                  {mriList.map(ocs => (
                    <tr
                      key={ocs.id}
                      className={selectedMri === ocs.id ? 'selected' : ''}
                      onClick={() => setSelectedMri(ocs.id)}
                    >
                      <td><input type="radio" name="mri" checked={selectedMri === ocs.id} readOnly /></td>
                      <td>{ocs.ocs_id}</td>
                      <td>{ocs.patient_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gene 선택 */}
          <div className="ai-panel-col">
            <div className="ai-section-title">Gene ({geneList.length})</div>
            <div className="ai-table-container small">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>OCS ID</th>
                    <th>환자명</th>
                  </tr>
                </thead>
                <tbody>
                  {geneList.map(ocs => (
                    <tr
                      key={ocs.id}
                      className={selectedGene === ocs.id ? 'selected' : ''}
                      onClick={() => setSelectedGene(ocs.id)}
                    >
                      <td><input type="radio" name="gene" checked={selectedGene === ocs.id} readOnly /></td>
                      <td>{ocs.ocs_id}</td>
                      <td>{ocs.patient_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 결과 */}
          <div className="ai-panel-col result">
            <div className="ai-section-title">결과</div>
            <button
              className="ai-btn primary orange"
              onClick={handleInference}
              disabled={(!selectedMri && !selectedGene) || inferring}
            >
              {inferring ? '추론 중...' : 'MM 추론'}
            </button>
            {error && <div className="ai-error">{error}</div>}
            {result ? (
              <pre className="ai-result-json">{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <div className="ai-no-result">데이터 선택 후 추론 요청</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
