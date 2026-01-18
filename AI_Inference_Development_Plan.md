# Brain Tumor CDSS - AI Inference 개선 계획

> **마지막 업데이트**: 2025-01-18
>
> **완료 현황**: 대부분의 핵심 기능 구현 완료. 아래는 남은 개선 사항.

---

## 남은 작업 목록

### 1. 스타일 통합 (선택 사항)

| 작업 | 파일 | 설명 | 우선순위 |
|------|------|------|----------|
| 1 | `ai-inference.css` | 통합 AI 스타일 파일 생성 | 🟢 낮음 |

> 참고: 현재 각 컴포넌트별 CSS 파일이 존재하므로 통합 파일은 선택 사항입니다.

---

### 2. 기존 페이지 개선 계획 (미구현)

#### 2.1 `/ai/process-status` - AI 처리 현황 페이지 개선

**현재 상태**: 상태별 통계, 진행 중 요청, 최근 결과 표시

**개선 사항**:

| 항목 | 현재 | 개선안 | 우선순위 |
|------|------|--------|----------|
| 시간 필터 | 변수만 있음 (미구현) | 실제 시간 범위 필터 구현 | 🔴 높음 |
| 실시간 업데이트 | 5초 폴링 | WebSocket + 폴링 하이브리드 | 🟡 중간 |
| 차트 시각화 | 없음 | 처리량 추이 차트 | 🟡 중간 |
| 알림 | 없음 | 실패 알림 배지 | 🔴 높음 |
| 자동 새로고침 | 수동만 | 자동 새로고침 토글 | 🟢 낮음 |
| 모델별 대기열 | 간단한 통계 | 대기열 시각화 | 🟢 낮음 |

**화면 개선안**:
```
┌─────────────────────────────────────────────────────────────────┐
│ AI 처리 현황                        [자동 새로고침 ●] [새로고침] │
│ AI 추론 요청의 실시간 처리 상태를 모니터링합니다                   │
├─────────────────────────────────────────────────────────────────┤
│ 기간: [오늘] [이번 주] [이번 달]                                  │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│ │대기중│ │검증중│ │처리중│ │완료  │ │실패🔴│ │취소  │          │
│ │  3   │ │  1   │ │  2   │ │ 45   │ │ 5(!)│ │  2   │          │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
├─────────────────────────────────────────────────────────────────┤
│ 처리량 추이 (최근 24시간)                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │    ▓                                                        │ │
│ │    ▓ ▓         ▓                                            │ │
│ │  ▓ ▓ ▓ ▓     ▓ ▓ ▓                                         │ │
│ │▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ...      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│  00시      06시      12시      18시      현재                    │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ 진행 중인 요청 (6) ──────────┐ ┌─ 최근 실패 (!) ──────────┐ │
│ │ M1 홍길동 처리중 14:30       │ │ M1 박지성 OOM 14:25      │ │
│ │ MG 김철수 검증중 14:32       │ │ MM 손흥민 Timeout 14:20  │ │
│ │ ...                          │ │ ...                       │ │
│ └──────────────────────────────┘ └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**추가할 코드**:
```typescript
// AIProcessStatusPage.tsx에 추가할 기능

// 1. 시간 필터 실제 구현
const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

const getFilteredRequests = useCallback(() => {
  const now = new Date();
  const startDate = new Date();

  switch (timeRange) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
  }

  return requests.filter(req =>
    new Date(req.requested_at) >= startDate
  );
}, [requests, timeRange]);

// 2. 실패 알림 배지
const failedCount = statusStats.FAILED;
const hasNewFailures = failedCount > previousFailedCount;

// 3. 자동 새로고침 토글
const [autoRefresh, setAutoRefresh] = useState(true);

useEffect(() => {
  if (!autoRefresh) return;
  const interval = setInterval(refresh, 5000);
  return () => clearInterval(interval);
}, [autoRefresh, refresh]);
```

---

#### 2.2 `/ai/models` - AI 모델 정보 페이지 개선

**현재 상태**: 모델 목록, 상세 정보 펼치기, 비교 테이블

**개선 사항**:

| 항목 | 현재 | 개선안 | 우선순위 |
|------|------|--------|----------|
| 모델 상태 | 없음 | 실시간 상태 (가용/점검 중) | 🔴 높음 |
| 사용 통계 | 없음 | 모델별 사용량/성공률 표시 | 🟡 중간 |
| 버전 정보 | 없음 | 모델 버전, 최근 업데이트 | 🟡 중간 |
| 즐겨찾기 | 없음 | 자주 사용하는 모델 즐겨찾기 | 🟢 낮음 |
| 성능 지표 | 하드코딩 | API에서 동적으로 가져오기 | 🔴 높음 |

**화면 개선안**:
```
┌─────────────────────────────────────────────────────────────────┐
│ AI 모델 정보                                     [+ 새 분석 요청] │
│ 사용 가능한 AI 분석 모델 목록 및 상세 정보                        │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🧠 M1 - MRI 분석            [가용] ⭐                        │ │
│ │ MRI 4채널 영상 기반 뇌종양 분석                              │ │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────────┐ │ │
│ │ │처리시간  │ │정확도   │ │금주 사용│ │성공률               │ │ │
│ │ │2-5분    │ │92.5%   │ │ 45건   │ │████████░░ 89%     │ │ │
│ │ └─────────┘ └─────────┘ └─────────┘ └─────────────────────┘ │ │
│ │ 버전: v2.1.0 (2025-01-10 업데이트)                          │ │
│ │                                        [이 모델로 분석 요청] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🧬 MG - Gene 분석           [점검 중 🔧]                     │ │
│ │ RNA 시퀀싱 데이터 기반 유전자 분석                           │ │
│ │ ※ 현재 모델 업데이트 중 (예상 완료: 15:00)                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔬 MM - 멀티모달 분석        [가용]                          │ │
│ │ MRI + Gene + Protein 통합 분석                              │ │
│ │ ...                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**추가할 코드**:
```typescript
// AIModelsPage.tsx에 추가할 기능

// 1. 모델 상태 API
interface ModelStatus {
  code: string;
  status: 'available' | 'maintenance' | 'unavailable';
  maintenance_until?: string;
  version: string;
  last_updated: string;
}

const { modelStatus } = useModelStatus();

// 2. 모델별 통계 API
interface ModelStats {
  code: string;
  total_requests: number;
  success_rate: number;
  avg_processing_time: number;
  weekly_usage: number;
}

const { modelStats } = useModelStats();

// 3. 즐겨찾기 (localStorage)
const [favorites, setFavorites] = useState<string[]>(() => {
  const saved = localStorage.getItem('ai_model_favorites');
  return saved ? JSON.parse(saved) : [];
});
```

---

### 3. 개선 작업 체크리스트

#### AIProcessStatusPage 개선
- [ ] 시간 범위 필터 실제 구현
- [ ] 실패 알림 배지 추가
- [ ] 자동 새로고침 토글 추가
- [ ] 처리량 추이 차트 (선택)

#### AIModelsPage 개선
- [ ] 모델 상태 API 연동 (가용/점검 중)
- [ ] 버전 정보 표시
- [ ] 모델별 사용 통계 표시
- [ ] 즐겨찾기 기능 (선택)

---

## 완료된 작업 (참고용)

> 아래 항목들은 모두 구현 완료됨

### 페이지 (6개 완료)
- ✅ M1InferencePage.tsx
- ✅ M1DetailPage.tsx
- ✅ MGInferencePage.tsx
- ✅ MGDetailPage.tsx
- ✅ MMInferencePage.tsx
- ✅ MMDetailPage.tsx

### 컴포넌트 (완료)
- ✅ SegMRIViewer.tsx + CSS
- ✅ InferenceResult.tsx + CSS
- ✅ OCSTable.tsx + CSS
- ✅ MGResultViewer.tsx + CSS
- ✅ GeneVisualization.tsx + CSS
- ✅ MMResultViewer.tsx + CSS

### 라우팅 & API (완료)
- ✅ routeMap.tsx에 6개 페이지 매핑
- ✅ ai.api.ts에 getSegmentationData, getGeneExpressionData 함수

---

## 결론

핵심 AI 분석 기능 (M1/MG/MM 페이지, 시각화 컴포넌트)은 모두 구현 완료됨.

**남은 작업**: 기존 관리 페이지의 UX 개선
- `/ai/process-status`: 시간 필터, 실패 알림, 차트
- `/ai/models`: 모델 상태, 버전 정보, 통계

예상 소요: 1주 (기존 페이지 개선만)
