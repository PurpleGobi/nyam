# 05: 통계 패널

> 홈 식당/와인 탭 통계 패널 — 지도, 장르/품종 차트, 점수 분포, 월별 소비, 프로그레시브 디스클로저

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §3-7 식당 통계 패널 (3-7-1~4), §4-4 와인 통계 패널 (4-4-1~4), §6 프로그레시브 디스클로저 |
| `systems/DATA_MODEL.md` | restaurants (country, city, genre), wines (country, region, sub_region, variety), records (satisfaction, total_price, purchase_price, visit_date) |
| `prototype/01_home.html` | `#foodStatsPanel`, `#wineStatsPanel`, `.pd-lock-overlay` |

---

## 선행 조건

- S2: records 테이블 (satisfaction, total_price, purchase_price, visit_date, scene)
- S4: restaurants (country, city, genre), wines (country, region, sub_region, variety, wine_type)
- S5-02: HomeState (activeTab)

---

## 구현 범위

### 파일 목록

```
src/presentation/components/home/stats-toggle.tsx         ← 통계 패널 on/off 토글 버튼
src/presentation/components/home/world-map-chart.tsx      ← 식당 세계지도 (SVG)
src/presentation/components/home/genre-chart.tsx          ← 장르 수평 바 차트
src/presentation/components/home/score-distribution.tsx   ← 점수 분포 6등분 차트
src/presentation/components/home/monthly-chart.tsx        ← 월별 소비 차트
src/presentation/components/home/scene-chart.tsx          ← 상황별 방문 바 차트 (식당)
src/presentation/components/home/wine-region-map.tsx      ← 와인 산지 지도 (3단계 드릴다운)
src/presentation/components/home/varietal-chart.tsx       ← 품종 차트 (body_order 정렬)
src/presentation/components/home/wine-type-chart.tsx      ← 와인 타입 분포 차트
src/presentation/components/home/pd-lock-overlay.tsx      ← 프로그레시브 디스클로저 잠금 오버레이
src/application/hooks/use-restaurant-stats.ts             ← 식당 통계 데이터
src/application/hooks/use-wine-stats.ts                   ← 와인 통계 데이터
```

### 스코프 외

- 와인 산지 지도의 실제 지리 SVG path (Phase 1은 간략 실루엣)
- 차트 애니메이션 (Phase 1은 즉시 렌더)

---

## 상세 구현 지침

### 1. StatsToggle 컴포넌트

```typescript
interface StatsToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  label: string;     // "통계"
}
```

- 통계 아이콘 버튼 (`bar-chart-2` lucide 18x18)
- 탭 시 패널 전체 show/hide
- 식당 탭: `#foodStatsPanel` 토글 (섹션별 PD 없음, 패널 전체 on/off)
- 와인 탭: `#wineStatsPanel` 토글 (섹션별 PD 개별 잠금)

### 2. WorldMapChart (식당 세계지도)

```typescript
interface WorldMapChartProps {
  cities: {
    name: string;          // "서울", "도쿄"
    country: string;
    lat: number;
    lng: number;
    visitCount: number;    // 방문 식당 수
  }[];
  totalCountries: number;
  totalPlaces: number;
}
```

**CSS**:

```css
.world-map-container {
  background: var(--bg-card);
  border-radius: 14px;
  border: 1px solid var(--border);
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.world-map-svg {
  width: 100%;
  height: auto;
}
.world-map-svg .continent {
  fill: var(--bg-page);
  stroke: none;
}

.city-marker {
  fill: var(--accent-food);
  opacity: 0.8;
}
/* 크기: r = 3 + Math.min(visitCount, 6) (range 3~8) */

.city-marker-label {
  fill: #fff;
  font-size: 8px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: central;
}

.map-legend {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 10px;
  color: var(--text-hint);
}
/* 범례: ● 1~2곳 (r=3), ● 3~5곳 (r=5), ● 6곳+ (r=8) */

.map-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
/* "5개국 12곳" */
```

### 3. GenreChart (장르 수평 바 차트)

```typescript
interface GenreChartProps {
  genres: {
    name: string;         // "한식", "일식"
    count: number;
  }[];
}
```

```css
.genre-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.genre-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.genre-name {
  width: 78px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  text-align: right;
  flex-shrink: 0;
}

.genre-bar-track {
  flex: 1;
  height: 16px;
  background: var(--bg-page);
  border-radius: 3px;
  overflow: hidden;
}

.genre-bar-fill {
  height: 100%;
  background: var(--accent-food);
  border-radius: 3px;
  /* width: (count / maxCount * 100)% */
  /* opacity: 0.4 + (count / maxCount) * 0.6 — 최솟값 0.4 */
}

.genre-count {
  width: 20px;
  font-size: 11px;
  font-weight: 800;
  color: var(--accent-food);
  text-align: right;
  flex-shrink: 0;
}
```

- 항목 정렬: count 내림차순
- 빈 항목 미표시

### 4. ScoreDistribution (점수 분포 6등분 차트)

```typescript
interface ScoreDistributionProps {
  buckets: {
    label: string;        // "~49", "50s", "60s", "70s", "80s", "90s"
    count: number;
  }[];
  accentColor: string;    // --accent-food 또는 --accent-wine
}
```

| 구간 | label |
|------|-------|
| 0~49 | ~49 |
| 50~59 | 50s |
| 60~69 | 60s |
| 70~79 | 70s |
| 80~89 | 80s |
| 90~100 | 90s |

```css
.score-dist {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 120px;
  padding: 0 16px;
}

.score-bar {
  flex: 1;
  border-radius: 4px 4px 0 0;
  position: relative;
  /* height: (count / maxCount * 100)% — 최소 2px */
  /* opacity 비례: 0.3 + (count / maxCount) * 0.7 */
}
.score-bar.restaurant { background: var(--accent-food); }
.score-bar.wine { background: var(--accent-wine); }

.score-bar-count {
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
}
/* 긴 바: 내부 하단, 흰색 */
.score-bar-count.inside { bottom: 4px; color: #fff; }
/* 짧은 바: 상단 외부, accent 색상 */
.score-bar-count.outside { bottom: calc(100% + 2px); }

.score-bar-label {
  font-size: 10px;
  color: var(--text-hint);
  text-align: center;
  margin-top: 4px;
}
```

- 0건 구간: min-height 2px, `--accent-food-light` 또는 `--accent-wine-light` 색상
- 탭 동작: 구간 탭 → 해당 점수대 필터 적용

### 5. MonthlyChart (월별 소비 차트)

```typescript
interface MonthlyChartProps {
  months: {
    label: string;         // "10월", "11월"
    count: number;         // 방문 수 또는 병 수
    amount: number;        // 원 단위
    isCurrent: boolean;    // 당월 여부
  }[];
  totalAmount: number;     // 총액
  accentColor: string;
  unit: string;            // "곳" 또는 "병"
}
```

```css
.monthly-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 120px;
  padding: 0 16px;
}

.monthly-bar {
  flex: 1;
  border-radius: 4px 4px 0 0;
  position: relative;
  /* height: (count / maxCount * 100)% */
  /* opacity: 0.3 + (count / maxCount) * 0.7 */
}

.monthly-amount {
  font-size: 8px;
  padding: 2px 4px;
  border-radius: 4px;
  background: var(--bg-page);
  color: var(--text-hint);
  text-align: center;
  margin-top: 4px;
}
.monthly-amount.current {
  background: var(--accent-food-light);  /* 와인: --accent-wine-light */
  color: var(--accent-food);             /* 와인: --accent-wine */
  font-weight: 600;
}

.monthly-total {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}
/* 섹션 라벨 옆 "총 186만" */
```

- 범위: 최근 6개월
- 금액 표시: 만 단위 포맷 (예: 186만)
- 식당: `total_price` SUM, 와인: `purchase_price` SUM

### 6. SceneChart (상황별 방문 차트, 식당 전용)

```typescript
interface SceneChartProps {
  scenes: {
    scene: string;        // 'solo', 'romantic', ...
    label: string;        // '혼밥', '데이트', ...
    count: number;
    color: string;        // --scene-solo 등
  }[];
}
```

- 수평 바 차트 (GenreChart와 동일 구조)
- 바 색상: 각 scene의 전용 색상 변수 사용

| scene | CSS 변수 | 색상 |
|-------|----------|------|
| solo | `--scene-solo` | `#7A9BAE` |
| romantic | `--scene-romantic` | `#B8879B` |
| friends | `--scene-friends` | `#7EAE8B` |
| family | `--scene-family` | `#C9A96E` |
| business | `--scene-business` | `#8B7396` |
| drinks | `--scene-drinks` | `#B87272` |

### 7. WineRegionMap (와인 산지 지도, 3단계 드릴다운)

```typescript
interface WineRegionMapProps {
  level: 0 | 1 | 2;
  data: WineMapData;
  onDrillDown: (target: string) => void;
  onBack: () => void;
}

// Level 0: 세계
interface WorldLevel {
  countries: {
    name: string;
    count: number;
    explored: boolean;
    dots: { type: 'red' | 'white' | 'rose' | 'sparkling'; count: number }[];
  }[];
  unexploredCountries: string[];
}

// Level 1: 국가
interface CountryLevel {
  countryName: string;
  totalCount: number;
  regions: {
    name: string;
    explored: boolean;
    canDrillDown: boolean;   // 세부 산지 데이터 있는지
    dots: { type: string; count: number }[];
  }[];
}

// Level 2: 산지
interface RegionLevel {
  regionName: string;
  regionNameKo: string;
  isEmpty: boolean;
  subRegions: string[];
  ctaLabel: string;          // "{산지} 와인 기록하기 →"
}
```

**CSS**:

```css
.wine-region-map {
  border-radius: 14px;
  overflow: hidden;
  position: relative;
}

/* Level 0 */
.wine-map-world {
  background: #1a1520;
  padding: 16px;
}
.wine-map-world .continent { fill: #2a2030; }
.wine-country-marker {
  opacity: 0.8;
  cursor: pointer;
}
/* 와인 dot 색상 */
.dot-red { fill: #722F37; }
.dot-white { fill: #D4C98A; }
.dot-rose { fill: #E8A0B0; }
.dot-sparkling { fill: #C8D8A0; }

/* 미탐험 국가: 점선 원 + 국기 이모지 */
.unexplored-marker {
  stroke: var(--text-hint);
  stroke-dasharray: 3 3;
  fill: none;
}

/* 범례 */
.wine-map-legend {
  display: flex;
  gap: 12px;
  padding: 8px 16px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

/* Level 1 뒤로 버튼 */
.wine-map-back {
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 4px 10px;
  font-size: 12px;
  background: var(--bg-card);
  cursor: pointer;
}
```

- Level 0 → Level 1: 국가 마커 탭
- Level 1 → Level 2: 확대 가능 산지 탭 (`canDrillDown = true`)
- Level 2: 빈 상태 시 CTA "보르도 와인 기록하기 →"

### 8. VarietalChart (품종 차트)

```typescript
interface VarietalChartProps {
  varieties: {
    name: string;          // "카베르네 소비뇽"
    nameEn: string;        // "Cabernet Sauvignon"
    count: number;         // 마신 병 수
    bodyOrder: number;     // 정렬 기준 (1=뮈스카, 20=프티 베르도)
  }[];
  showAllToggle: boolean;  // "마신 품종만" 토글 상태
  onToggle: () => void;
}
```

**전체 품종 목록 (bodyOrder 순)**:

| bodyOrder | 품종 |
|-----------|------|
| 1 | 뮈스카 |
| 2 | 리슬링 |
| 3 | 소비뇽 블랑 |
| 4 | 피노 그리 |
| 5 | 피노 누아 |
| 6 | 가메 |
| 7 | 바르베라 |
| 8 | 샤르도네 |
| 9 | 그르나슈 |
| 10 | 메를로 |
| 11 | 산지오베제 |
| 12 | 비오니에 |
| 13 | 템프라니요 |
| 14 | 쉬라즈 |
| 15 | 네비올로 |
| 16 | 말벡 |
| 17 | 카베르네 소비뇽 |
| 18 | 무르베드르 |
| 19 | 타나 |
| 20 | 프티 베르도 |

```css
.varietal-chart {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.variety-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.variety-row.empty { display: none; }
.variety-row.empty.show-all { display: flex; opacity: 0.3; }

.variety-name {
  width: 78px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  text-align: right;
  flex-shrink: 0;
}

.variety-hbar-track {
  flex: 1;
  height: 16px;
  background: var(--bg-page);
  border-radius: 3px;
  overflow: hidden;
}

.variety-hbar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(139, 115, 150, 0.5), var(--accent-wine));
}

.variety-count {
  width: 20px;
  font-size: 11px;
  font-weight: 800;
  color: var(--accent-wine);
  text-align: right;
  flex-shrink: 0;
}

.variety-toggle-switch {
  width: 32px;
  height: 18px;
  border-radius: 100px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}
.variety-toggle-switch.on {
  background: var(--accent-wine);
  border-color: var(--accent-wine);
}
```

- 정렬: bodyOrder 오름차순 (얇은 → 두꺼운)
- "마신 품종만" 토글 off → 전체 20종 표시 (0병은 `.empty`)
- 토글 on → count > 0인 품종만
- 품종 행 탭 → 해당 품종 와인 필터

### 9. PDLockOverlay (프로그레시브 디스클로저)

```typescript
interface PDLockOverlayProps {
  minRecords: number;       // data-pd-min 값
  currentCount: number;     // 현재 기록 수
  children: React.ReactNode;
}
```

```css
.pd-section-wrap {
  position: relative;
}

.pd-lock-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(248, 246, 243, 0.85);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: inherit;
}

.pd-lock-icon {
  color: var(--text-hint);
  /* lock lucide 20x20 */
}

.pd-lock-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-hint);
}

.pd-section-wrap.unlocked .pd-lock-overlay {
  display: none;
}
```

**프로그레시브 디스클로저 규칙**:

| 기능 | 식당 조건 | 와인 조건 |
|------|----------|----------|
| 통계 패널 토글 가능 | 기록 5개+ | 기록 5개+ |
| 산지 지도 | (패널 전체 토글) | `data-pd-min="5"` |
| 품종 차트 + 점수 분포 | (패널 전체 토글) | `data-pd-min="10"` |
| 월별 소비 | (패널 전체 토글) | `data-pd-min="20"` |
| 상황 필터 활성 | 기록 10개+ (상황 2종 이상, 각 3개+) | — |

- 식당 통계: 패널 전체가 한번에 토글됨 (섹션별 PD 없음)
- 와인 통계: 섹션별 `pd-section-wrap` + `pd-lock-overlay` 개별 잠금/해제

### 10. useRestaurantStats 훅

```typescript
function useRestaurantStats(userId: string): {
  isLoading: boolean;
  cityStats: { name: string; country: string; lat: number; lng: number; visitCount: number }[];
  genreStats: { name: string; count: number }[];
  scoreBuckets: { label: string; count: number }[];
  monthlyStats: { label: string; count: number; amount: number; isCurrent: boolean }[];
  totalSpending: number;
  sceneStats: { scene: string; label: string; count: number; color: string }[];
  totalRecordCount: number;
}
```

### 11. useWineStats 훅

```typescript
function useWineStats(userId: string): {
  isLoading: boolean;
  countryStats: WorldLevel;
  varietalStats: { name: string; nameEn: string; count: number; bodyOrder: number }[];
  scoreBuckets: { label: string; count: number }[];
  monthlyStats: { label: string; count: number; amount: number; isCurrent: boolean }[];
  totalSpending: number;
  wineTypeStats: { type: string; label: string; count: number }[];
  totalRecordCount: number;
}
```

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|-----------|----------|
| `prototype/01_home.html` `#foodStatsPanel` | 식당 통계 (WorldMapChart + GenreChart + ScoreDistribution + MonthlyChart + SceneChart) |
| `prototype/01_home.html` `#wineStatsPanel` | 와인 통계 (WineRegionMap + VarietalChart + ScoreDistribution + MonthlyChart) |
| `prototype/01_home.html` `.pd-lock-overlay` | `PDLockOverlay` |
| `prototype/01_home.html` `.variety-chart` | `VarietalChart` |

---

## 데이터 흐름

```
[records + restaurants JOIN] → useRestaurantStats() → 식당 통계 데이터
  → WorldMapChart(cities) + GenreChart(genres) + ScoreDistribution(buckets)
  → MonthlyChart(months) + SceneChart(scenes)

[records + wines JOIN] → useWineStats() → 와인 통계 데이터
  → WineRegionMap(countries) + VarietalChart(varieties) + ScoreDistribution(buckets)
  → MonthlyChart(months) + WineTypeChart(types)

[totalRecordCount] → PDLockOverlay(minRecords, currentCount)
  → currentCount >= minRecords → .unlocked → overlay 숨김
```

---

## 검증 체크리스트

```
□ 식당 통계: 세계지도 SVG, 도시 마커 크기 비례 (r=3~8), 범례 3단계
□ 식당 통계: 장르 수평 바, --accent-food, opacity 비례
□ 식당 통계: 점수 분포 6등분 (~49/50s/60s/70s/80s/90s), 0건 min 2px
□ 식당 통계: 월별 소비 6개월, 금액 뱃지, 당월 accent 강조, 총액
□ 식당 통계: 상황별 바 차트, scene 전용 색상
□ 와인 통계: 산지 지도 Level 0 (세계), 와인 dot 색상 (red/white/rose/sparkling)
□ 와인 통계: 산지 지도 Level 1 (국가 드릴다운), 뒤로 버튼
□ 와인 통계: 산지 지도 Level 2 (산지), 빈 상태 CTA
□ 와인 통계: 품종 차트 bodyOrder 정렬, 20종, 토글 정상
□ 와인 통계: 품종 바 gradient, "마신 품종만" 스위치 32x18
□ 와인 통계: 점수 분포 6등분, --accent-wine
□ 와인 통계: 월별 소비 병 수 + 금액
□ PD: 식당은 패널 전체 토글 (섹션별 잠금 없음)
□ PD: 와인 산지 지도 5개+, 품종+점수 10개+, 월별 20개+ 잠금 해제
□ PD: 잠금 오버레이 blur(6px) + 자물쇠 + 텍스트
□ 360px: 차트 스크롤/축소 정상
□ R1~R5 위반 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
