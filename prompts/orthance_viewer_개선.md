# Orthanc Viewer 개선 작업 기록

> **작업일**: 2026-01-13
> **담당**: Agent C (프론트엔드)

---

## 개선 사항 요약

| # | 개선 항목 | 파일 | 상태 |
|---|----------|------|------|
| 1 | V1→V2→V1 탭 전환 시 데이터 유지 | PacsSelector.jsx | ✅ 완료 |
| 2 | 우선순위 로딩 (첫 슬라이스 즉시 표시) | ViewerSection.jsx | ✅ 완료 |
| 3 | Base/Overlay 로딩 분리 | ViewerSection.jsx | ✅ 완료 |
| 4 | API 캐싱 (5분 TTL) | PacsSelector.jsx | ✅ 완료 |

---

## 1. V1→V2→V1 탭 전환 시 데이터 유지

### 문제점
- 뷰어 탭 전환 시 `PacsSelector` 컴포넌트가 재생성됨
- OCS 모드에서 자동 선택 로직이 재실행되어 기존 선택이 초기화됨
- Race condition으로 인한 상태 불일치

### 해결책

**파일**: `src/components/PacsSelector.jsx`

```javascript
// 1. 마운트 상태 추적
const mountedRef = useRef(true);

useEffect(() => {
  mountedRef.current = true;
  return () => {
    mountedRef.current = false;
  };
}, []);

// 2. initialSelection이 있으면 OCS 자동 선택 건너뛰기
const hasInitialData = Boolean(initialSelection?.patientId && initialSelection?.baseSeriesId);

// 3. 비동기 작업에 cancelled 플래그 추가
useEffect(() => {
  let cancelled = false;

  async function restore() {
    // ...
    if (cancelled || !mountedRef.current) return;
    // ...
  }

  restore();
  return () => { cancelled = true; };
}, [/* deps */]);

// 4. OCS 자동 선택 시 hasInitialData 체크
if (hasInitialData) {
  return; // 기존 데이터가 있으면 자동 선택 건너뛰기
}
```

---

## 2. 우선순위 로딩 (첫 슬라이스 즉시 표시)

### 문제점
- 시리즈 선택 시 모든 인스턴스 로딩 완료까지 대기 필요
- Orthanc 초기 로딩 시간이 오래 걸림

### 해결책

**파일**: `src/components/ViewerSection.jsx`

```javascript
// 1. 인스턴스 목록만 먼저 가져와서 상태 설정 (즉시 렌더링 가능)
const base = await getInstances(baseSeriesId);
setBaseInstances(sortedBase);
setLoading(false); // 여기서 로딩 완료

// 2. 첫 번째 인스턴스 우선 프리로드
const firstUrl = getInstanceFileUrl(firstId);
await cornerstone.loadAndCacheImage(`wadouri:${firstUrl}`);

// 3. 나머지 인스턴스 백그라운드 프리로드 (배치 처리)
const BATCH_SIZE = 5;
for (let i = 1; i < sortedBase.length; i += BATCH_SIZE) {
  const batch = sortedBase.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(inst =>
    cornerstone.loadAndCacheImage(`wadouri:${url}`)
  ));
  setPreloadProgress({ loaded: i + BATCH_SIZE, total: sortedBase.length });
}
```

### UI 표시

```jsx
{preloadProgress.total > 0 && preloadProgress.loaded < preloadProgress.total && (
  <span className="preloadProgress">
    ({Math.round((preloadProgress.loaded / preloadProgress.total) * 100)}% cached)
  </span>
)}
```

**CSS**: `src/components/ViewerSection.css`
```css
.preloadProgress {
  font-size: 11px;
  color: rgba(66, 245, 141, 0.9);
  margin-left: 8px;
  opacity: 0.85;
}
```

---

## 3. Base/Overlay 로딩 분리

### 문제점
- Overlay Series 선택 시 Base 이미지가 리셋됨
- 현재 슬라이스 위치가 초기화됨

### 해결책

**파일**: `src/components/ViewerSection.jsx`

기존: 하나의 useEffect에서 `[baseSeriesId, overlaySeriesId]` 의존

변경: 두 개의 독립적인 useEffect로 분리

```javascript
// Base Series 로딩 (overlaySeriesId 변경 시 영향 없음)
useEffect(() => {
  // Base 로딩 로직...
}, [baseSeriesId]); // ✅ baseSeriesId만 의존

// Overlay Series 로딩 (별도 useEffect - Base 영향 없음)
useEffect(() => {
  // Overlay 로딩 로직...
}, [overlaySeriesId]); // ✅ overlaySeriesId만 의존
```

---

## 4. API 캐싱 (5분 TTL)

### 문제점
- 탭 전환마다 API 재호출
- 동일 데이터 반복 요청

### 해결책

**파일**: `src/components/PacsSelector.jsx`

```javascript
// 간단한 메모리 캐시 (5분 TTL)
const cache = {
  studies: new Map(),  // patientId -> { data, timestamp }
  series: new Map(),   // studyId -> { data, timestamp }
  TTL: 5 * 60 * 1000,  // 5분
};

const getCachedStudies = async (patientId) => {
  const cached = cache.studies.get(patientId);
  if (cached && Date.now() - cached.timestamp < cache.TTL) {
    return cached.data;
  }
  const data = await getStudies(patientId);
  cache.studies.set(patientId, { data, timestamp: Date.now() });
  return data;
};

const getCachedSeries = async (studyId) => {
  const cached = cache.series.get(studyId);
  if (cached && Date.now() - cached.timestamp < cache.TTL) {
    return cached.data;
  }
  const data = await getSeries(studyId);
  cache.series.set(studyId, { data, timestamp: Date.now() });
  return data;
};
```

---

## 수정된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/components/PacsSelector.jsx` | 캐싱, V1→V2→V1 복원, race condition 해결 |
| `src/components/ViewerSection.jsx` | 우선순위 로딩, Base/Overlay 분리 |
| `src/components/ViewerSection.css` | 프리로드 진행률 스타일 |

---

## 테스트 시나리오

### 1. V1→V2→V1 탭 전환
1. V1에서 시리즈 선택 및 슬라이스 이동
2. V2 탭 클릭
3. V1 탭 다시 클릭
4. **예상 결과**: V1의 선택 상태와 슬라이스 위치 유지

### 2. 우선순위 로딩
1. 시리즈 선택
2. **예상 결과**: 첫 슬라이스 즉시 표시, 진행률 표시 (XX% cached)

### 3. Overlay 선택 시 Base 유지
1. Base Series 선택 후 슬라이스 73번으로 이동
2. Overlay Series (seg) 선택
3. **예상 결과**: 슬라이스 73번 유지, Base 이미지 리셋 없음

---

## 향후 개선 가능 사항

- [ ] Cornerstone 이미지 캐시 크기 제한 설정
- [ ] 현재 슬라이스 주변 우선 프리로드 (예: 현재 ±10)
- [ ] WebWorker를 통한 백그라운드 디코딩
