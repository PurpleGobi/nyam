# 05: 통계 패널

> 홈 식당/와인 탭 통계 패널 — 지도, 장르/품종 차트, 점수 분포, 월별 소비, 프로그레시브 디스클로저

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §3-7 식당 통계 패널, §4-4 와인 통계 패널, §6 프로그레시브 디스클로저 |
| `systems/DATA_MODEL.md` | restaurants, wines, records 테이블 |
| `prototype/01_home.html` | `#foodStatsPanel`, `#wineStatsPanel`, `.pd-lock-overlay` |

---

## 구현 완료 파일 목록

```
src/presentation/components/home/stats-toggle.tsx         ← 통계 패널 on/off 토글 버튼
src/presentation/components/home/world-map-chart.tsx      ← 식당 세계지도 (SVG)
src/presentation/components/home/genre-chart.tsx          ← 장르 수평 바 차트
src/presentation/components/home/score-distribution.tsx   ← 점수 분포 6등분 차트
src/presentation/components/home/monthly-chart.tsx        ← 월별 소비 차트
src/presentation/components/home/scene-chart.tsx          ← 상황별 방문 바 차트 (식당)
src/presentation/components/home/wine-region-map.tsx      ← 와인 산지 지도
src/presentation/components/home/varietal-chart.tsx       ← 품종 차트
src/presentation/components/home/wine-type-chart.tsx      ← 와인 타입 분포 차트
src/presentation/components/home/pd-lock-overlay.tsx      ← 프로그레시브 디스클로저 잠금 오버레이
src/application/hooks/use-restaurant-stats.ts             ← 식당 통계 데이터
src/application/hooks/use-wine-stats.ts                   ← 와인 통계 데이터
```

모든 차트 컴포넌트는 `home-container.tsx`에서 lazy loading (`next/dynamic`, `ssr: false`):
- WorldMapChart, GenreChart, ScoreDistribution, MonthlyChart, SceneChart
- WineRegionMap, VarietalChart, WineTypeChart

---

## 상세 구현 현황

### 1. 통계 패널 표시 조건

- `canShowStats = totalRecordCount >= 5` (식당/와인 각각)
- 캘린더 뷰, 지도 뷰, 팔로잉 모드에서는 통계 패널 숨김
- `StatsToggle`: 버튼 탭으로 패널 전체 show/hide

### 2. 식당 통계 (activeTab === 'restaurant')

`useRestaurantStats(userId)` 훅:

```
┌─ WorldMapChart (도시별 방문 마커)
├─ GenreChart (장르 수평 바 차트, 있을 때만)
├─ ScoreDistribution (점수 분포 6등분, --accent-food)
├─ MonthlyChart (월별 소비, unit="곳")
└─ SceneChart (상황별 바 차트, 있을 때만)
```

- 섹션별 PD 없음 — 패널 전체가 한번에 토글

### 3. 와인 통계 (activeTab === 'wine')

`useWineStats(userId)` 훅:

```
┌─ PdLockOverlay(minRecords=5)
│  └─ WineRegionMap (와인 산지 지도)
├─ PdLockOverlay(minRecords=10)
│  ├─ VarietalChart (품종 차트)
│  └─ ScoreDistribution (점수 분포 6등분, --accent-wine)
└─ PdLockOverlay(minRecords=20)
   ├─ MonthlyChart (월별 소비, unit="병")
   └─ WineTypeChart (와인 타입 분포)
```

- 와인 통계: 섹션별 `PdLockOverlay` 개별 잠금/해제

### 4. PdLockOverlay (프로그레시브 디스클로저)

```typescript
interface PDLockOverlayProps {
  minRecords: number
  currentCount: number
  children: React.ReactNode
}
```

- `currentCount >= minRecords` → children 표시 (잠금 해제)
- `currentCount < minRecords` → blur 오버레이 + 자물쇠 + "N개 이상 기록 시 해제" 텍스트

**와인 PD 규칙**:
| 기능 | 조건 |
|------|------|
| 산지 지도 | `minRecords=5` |
| 품종 + 점수 분포 | `minRecords=10` |
| 월별 소비 + 와인 타입 | `minRecords=20` |

### 5. HomeContainer에서의 통계 렌더링

```typescript
// 통계 패널 표시 조건
const canShowStats = activeTab === 'restaurant'
  ? restaurantStats.totalRecordCount >= 5
  : wineStats.totalRecordCount >= 5

// 숨김 조건
{!isCalendarMode && !isFollowingMode && !(viewMode === 'map' && activeTab === 'restaurant') && canShowStats && (
  <StatsToggle ... />
  {isStatsOpen && ( /* 차트들 */ )}
)}
```

---

## 데이터 흐름

```
[records + restaurants JOIN] → useRestaurantStats(userId) → 식당 통계 데이터
  → WorldMapChart(cities) + GenreChart(genres) + ScoreDistribution(buckets)
  → MonthlyChart(months) + SceneChart(scenes)

[records + wines JOIN] → useWineStats(userId) → 와인 통계 데이터
  → WineRegionMap(data) + VarietalChart(varieties) + ScoreDistribution(buckets)
  → MonthlyChart(months) + WineTypeChart(types)

[totalRecordCount] → canShowStats (5개+) → StatsToggle 표시
                   → PdLockOverlay (5/10/20 기준 해제)
```

---

## 검증 체크리스트

```
□ 식당 통계: 세계지도 SVG, 도시 마커
□ 식당 통계: 장르 수평 바, --accent-food
□ 식당 통계: 점수 분포 6등분
□ 식당 통계: 월별 소비, 당월 강조, 총액
□ 식당 통계: 상황별 바 차트
□ 와인 통계: 산지 지도 (WineRegionMap)
□ 와인 통계: 품종 차트
□ 와인 통계: 점수 분포, --accent-wine
□ 와인 통계: 월별 소비 + 와인 타입
□ PD: 와인 산지 5개+, 품종+점수 10개+, 월별+타입 20개+ 해제
□ 통계 숨김: 캘린더/지도/팔로잉 모드에서 숨김
□ 통계 표시: totalRecordCount >= 5 일 때만 StatsToggle 표시
□ lazy loading: 모든 차트 next/dynamic, ssr:false
□ 360px: 차트 정상 표시
□ R1~R5 위반 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
