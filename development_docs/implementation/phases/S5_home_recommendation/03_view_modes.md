# 03: 뷰 모드 — 카드/리스트/캘린더/지도

> 홈 콘텐츠 영역의 4가지 뷰 모드 (card, list, calendar, map) 컴포넌트 구현

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §2-4-1 보기 사이클, §3-4 플레이스 카드, §3-5 미평가 카드, §3-6 지도 뷰, §4-3 와인 카드, §4-1-1 셀러 카드 |
| `systems/DESIGN_SYSTEM.md` | 컬러 토큰, 게이지 색상, 상황 태그 색상 |
| `systems/RATING_ENGINE.md` | 사분면 좌표, 만족도 |
| `prototype/01_home.html` | `.place-card`, `.compact-item`, `.calendar-view`, `#mapView` |

---

## 선행 조건

- S2: DiningRecord 엔티티, RecordRepository
- S4: Restaurant 엔티티, Wine 엔티티, Wishlist 엔티티
- S5-02: HomeState (viewMode, activeTab, activeChipId)

---

## 구현 범위

### 파일 목록

```
src/presentation/components/home/record-card.tsx         ← 식당 플레이스 카드
src/presentation/components/home/wine-card.tsx            ← 와인 카드
src/presentation/components/home/compact-list-item.tsx    ← 리스트 뷰 아이템
src/presentation/components/home/calendar-view.tsx        ← 캘린더 뷰
src/presentation/components/home/calendar-day-detail.tsx  ← 캘린더 날짜 상세 팝업
src/presentation/components/home/map-view.tsx             ← 지도 뷰 (식당 전용)
src/presentation/components/home/map-pin.tsx              ← 지도 핀 마커
src/presentation/components/home/mini-quadrant.tsx        ← 사분면 미니 (44x44)
src/presentation/components/home/source-tag.tsx           ← 소스 태그 (나/버블/웹/AI/셀러)
src/presentation/components/home/place-badge.tsx          ← 뱃지 (미슐랭/블루리본/TV)
src/application/hooks/use-home-records.ts                 ← 홈 레코드 조회 (필터/소팅 적용)
src/application/hooks/use-calendar-records.ts             ← 캘린더용 월별 레코드
```

### 스코프 외

- 카카오맵 SDK 연동 실제 구현 (이 태스크에서는 정적 지도 + 마커 UI만)
- 필터/소팅 엔진 (04_filter_sort.md)
- 추천 카드 (07_recommendation.md)

---

## 상세 구현 지침

### 1. RecordCard (식당 플레이스 카드)

```typescript
interface RecordCardProps {
  restaurant: {
    id: string;
    name: string;
    genre: string;
    area: string;
    photoUrl: string | null;
    michelinStars: number | null;
    hasBlueRibbon: boolean;
    mediaAppearances: { show: string }[] | null;
    naverRating: number | null;
    kakaoRating: number | null;
    googleRating: number | null;
  };
  myRecord: {
    satisfaction: number | null;
    axisX: number | null;
    axisY: number | null;
    scene: string | null;
    visitDate: string | null;
    status: 'checked' | 'rated' | 'draft';
  } | null;
  bubbleRecords: {
    nickname: string;
    satisfaction: number;
    comment: string | null;
  }[];
  engagementCount: { likes: number; comments: number };
  isNotMine?: boolean;   // 내 점수 아님 표시 (찜/추천)
}
```

**카드 레이아웃**:

```css
.place-card {
  display: flex;
  margin: 0 16px;
  border-radius: 16px;
  border: 1px solid var(--border);
  min-height: 190px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.1s;
}
.place-card:active { transform: scale(0.985); }

.place-photo-col {
  width: 46%;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
  position: relative;
}

.place-info-col {
  flex: 1;
  padding: 14px;
  display: flex;
  flex-direction: column;
}

.place-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.place-meta {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 10px;
}

.place-score-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.place-total-score {
  font-size: 32px;
  font-weight: 800;
  color: var(--accent-food);
}
.place-total-score.not-mine {
  color: var(--text-hint);
}

.place-sources {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.place-engagement {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--text-hint);
  margin-top: auto;
}
```

카드 간 간격: `12px` (flex column gap).

### 2. SourceTag 컴포넌트

```typescript
interface SourceTagProps {
  type: 'me' | 'bubble' | 'web' | 'ai' | 'cellar';
  children: React.ReactNode;
}
```

| 타입 | 배경 | 텍스트 색 | 라벨 스타일 |
|------|------|----------|------------|
| `me` | `--accent-food-light` | `--accent-food` | 9px 800 uppercase |
| `bubble` | `rgba(122,155,174,0.15)` | `--accent-social` | 9px 800 |
| `web` | `var(--bg-page)` | `--text-hint` | 9px 800 |
| `ai` | `rgba(126,174,139,0.15)` | `--positive` | 9px 800 |
| `cellar` | `--accent-wine-light` | `--accent-wine` | 9px 800 |

### 3. PlaceBadge 컴포넌트

```typescript
interface PlaceBadgeProps {
  type: 'michelin' | 'blue_ribbon' | 'tv';
  label: string;   // "미슐랭 ★", "블루리본", "흑백요리사"
}
```

```css
.place-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.place-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 6px;
  backdrop-filter: blur(8px);
}
.badge-michelin { background: rgba(220, 50, 50, 0.9); color: #fff; }
.badge-blue     { background: rgba(59, 130, 246, 0.9); color: #fff; }
.badge-tv       { background: rgba(0, 0, 0, 0.75); color: #fff; }
```

### 4. MiniQuadrant 컴포넌트

```typescript
interface MiniQuadrantProps {
  axisX: number;     // 0~100
  axisY: number;     // 0~100
  satisfaction: number; // 1~100
  accentColor: string; // --accent-food 또는 --accent-wine
}
```

```css
.mini-quad {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--bg-page);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
```

- 십자선: 1px `var(--border)`, 수직/수평 중앙
- dot 위치: `left: (axisX / 100 * 44)px`, `bottom: (axisY / 100 * 44)px`
- dot 크기: `satisfaction` 기반 — `4 + (satisfaction / 100) * 6`px (4~10px)
- dot 색상: 게이지 색상 매핑 (`getGaugeColor(satisfaction)`)

### 5. WineCard (와인 카드)

```typescript
interface WineCardProps {
  wine: {
    id: string;
    name: string;
    wineType: string;         // 'red' | 'white' | 'rose' | ...
    variety: string | null;
    region: string | null;
    photoUrl: string | null;
  };
  myRecord: {
    satisfaction: number | null;
    axisX: number | null;     // 산미
    axisY: number | null;     // 바디
    visitDate: string | null;
    wineStatus: 'tasted' | 'cellar' | 'wishlist';
    purchasePrice: number | null;  // 셀러 전용
  } | null;
  bubbleMembers: {
    nickname: string;
    avatarColor: string;
    satisfaction: number;
  }[];
}
```

**와인 카드 CSS**:

```css
.wine-recent-card {
  display: flex;
  margin: 0 16px;
  border-radius: 16px;
  border: 1px solid var(--border);
  min-height: 170px;
  overflow: hidden;
  cursor: pointer;
}

.wine-photo-col {
  width: 46%;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 와인 사진 없을 때: 어두운 gradient + 와인 아이콘 */
  background: linear-gradient(135deg, #2a2030, #1a1520);
}

.wine-bubble-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.mini-av {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 8px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- 사분면: X=산미, Y=바디, dot=만족도, accent=`--accent-wine`
- 버블 행: 최대 2명 표시 (점수 높은 순), 3명+ 시 `+N`
- 셀러 카드: SourceTag type="cellar" + "구매 **금액** · 구매일" + 보관 상태

### 6. CompactListItem (리스트 뷰)

```typescript
interface CompactListItemProps {
  rank: number;
  thumbnailUrl: string | null;
  name: string;
  meta: string;            // "일식 · 광화문 · 미슐랭★" 또는 "레드 · 쉬라즈 · 호주"
  score: number | null;
  accentType: 'restaurant' | 'wine';
  onClick: () => void;
}
```

```css
.compact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.compact-rank {
  font-size: 14px;
  font-weight: 700;
  min-width: 20px;
  text-align: right;
}
.compact-rank.top3 { color: var(--accent-food); }  /* 와인: --accent-wine */
.compact-rank.rest { color: var(--text-hint); }

.compact-thumb {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.compact-score {
  font-size: 18px;
  font-weight: 700;
  margin-left: auto;
  flex-shrink: 0;
}
.compact-score.restaurant { color: var(--accent-food); }
.compact-score.wine { color: var(--accent-wine); }
.compact-score.unrated {
  color: var(--text-hint);
  /* 미평가: "—" 표시 */
}
```

- 와인 썸네일: 어두운 gradient 배경 + 와인병 SVG 오버레이
- 전체 데이터 표시 (페이지네이션 없음, 가상 스크롤 권장)

### 7. CalendarView (캘린더 뷰)

```typescript
interface CalendarViewProps {
  year: number;
  month: number;          // 1~12
  records: CalendarDayData[];
  onMonthChange: (year: number, month: number) => void;
  onDaySelect: (date: string) => void;
  selectedDate: string | null;
  accentType: 'restaurant' | 'wine';
}

interface CalendarDayData {
  date: string;           // 'YYYY-MM-DD'
  photoUrl: string | null;
  topScore: number | null;
  recordCount: number;
}
```

```css
.calendar-view { padding: 0 16px; }

.calendar-month {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.calendar-day {
  aspect-ratio: 1;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.calendar-day.has-photo {
  background-size: cover;
  background-position: center;
}
.calendar-day.has-photo::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
}

.cal-day-num {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-sub);
  z-index: 1;
}
.has-photo .cal-day-num {
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.cal-score {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  z-index: 1;
}

.cal-count {
  position: absolute;
  top: 2px;
  right: 3px;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  padding: 1px 4px;
  border-radius: 100px;
  z-index: 1;
}
.cal-count.restaurant { background: var(--accent-food); }
.cal-count.wine { background: var(--accent-wine); }
/* .wine-count 별칭 */

.calendar-day.today {
  box-shadow: 0 0 0 2px var(--accent-food);
}
.calendar-day.today.wine-cal {
  box-shadow: 0 0 0 2px var(--accent-wine);
}

.calendar-day.selected {
  background-color: var(--accent-food-light);
}

.calendar-day.empty {
  background: transparent;
  cursor: default;
}
```

- 월 네비: `◀ 2026년 3월 ▶` — `chevron-left` / `chevron-right` lucide
- 날짜 탭 시 하단에 CalendarDayDetail 표시
- calendar 모드에서 정렬 행 숨김

### 8. CalendarDayDetail (날짜 상세 팝업)

```typescript
interface CalendarDayDetailProps {
  date: string;             // "3월 19일 (수)"
  records: {
    mealTime: string;       // "점심", "저녁"
    name: string;
    score: number | null;
    id: string;
  }[];
}
```

- compact-item 형태로 시간대 + 이름 + 점수 표시
- "3월 19일 (수) · 2곳 방문" 헤더

### 9. MapView (지도 뷰, 식당 전용)

```typescript
interface MapViewProps {
  records: MapRecord[];
  onPinClick: (restaurantId: string) => void;
}

interface MapRecord {
  restaurantId: string;
  name: string;
  genre: string;
  area: string;
  lat: number;
  lng: number;
  score: number | null;
  distanceKm: number | null;
}
```

```css
#mapView {
  display: none; /* toggle */
}

.map-area {
  height: 320px;
  border-radius: 0 0 16px 16px;
  position: relative;
  overflow: hidden;
}

.map-pin {
  width: 28px;
  height: 28px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: var(--accent-food);
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
}
.map-pin-text {
  transform: rotate(45deg);
  font-size: 10px;
  font-weight: 700;
  color: #fff;
}

.map-current-location {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-social);
  border: 2.5px solid #fff;
  box-shadow: 0 0 8px rgba(122, 155, 174, 0.5);
  position: absolute;
}

.map-area-label {
  font-size: 11px;
  color: var(--text-hint);
  font-weight: 500;
  position: absolute;
}
```

- 하단 리스트: "지도에 표시된 N곳" 헤더 + CompactListItem 목록
- 지도 열림 시 카드 뷰 숨김, 닫힘 시 복원

### 10. useHomeRecords 훅

```typescript
// src/application/hooks/use-home-records.ts

function useHomeRecords(params: {
  tab: HomeTab;
  chipId: string | null;
  filters: FilterRule[];
  sort: SortOption;
  conjunction: 'and' | 'or';
}): {
  records: HomeRecordItem[];
  isLoading: boolean;
  totalCount: number;
  loadMore: () => void;
  hasMore: boolean;
}
```

- 필터 규칙을 Supabase 쿼리로 변환
- 소팅 적용 (latest/score_high/score_low/name/visit_count)
- 20건씩 무한 스크롤

### 11. useCalendarRecords 훅

```typescript
// src/application/hooks/use-calendar-records.ts

function useCalendarRecords(params: {
  tab: HomeTab;
  year: number;
  month: number;
}): {
  days: CalendarDayData[];
  isLoading: boolean;
}
```

- 해당 월의 모든 기록을 날짜별로 그루핑
- 각 날짜: 대표 사진, 최고 점수, 기록 수

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|-----------|----------|
| `prototype/01_home.html` `.place-card` | `RecordCard` |
| `prototype/01_home.html` `.wine-recent-card` | `WineCard` |
| `prototype/01_home.html` `.compact-item` | `CompactListItem` |
| `prototype/01_home.html` `.calendar-view` + `.calendar-grid` | `CalendarView` |
| `prototype/01_home.html` `.calendar-day-detail` | `CalendarDayDetail` |
| `prototype/01_home.html` `#mapView` | `MapView` |
| `prototype/01_home.html` `.mini-quad` | `MiniQuadrant` |
| `prototype/01_home.html` `.place-badges` | `PlaceBadge` |

---

## 데이터 흐름

```
[useHomeState()] → { tab, viewMode, filters, sort }
                 → useHomeRecords(tab, chipId, filters, sort)
                 → records[] → RecordCard / WineCard / CompactListItem

[캘린더 뷰]
useCalendarRecords(tab, year, month) → CalendarView(days)
  → 날짜 탭 → CalendarDayDetail(date, records)

[지도 뷰]
useHomeRecords(tab='restaurant', ...) → MapView(records with lat/lng)
  → 핀 탭 → restaurant detail 이동

[카드 탭] → router.push(`/restaurants/${id}`) 또는 `/wines/${id}`)
```

---

## 검증 체크리스트

```
□ RecordCard: 46% 사진 + info, radius 16px, min-height 190px, 12px gap
□ RecordCard: 사분면 미니 44x44, dot 위치/크기/색상 정확
□ RecordCard: 소스 태그 3종 (나/버블/웹) 색상 정확
□ RecordCard.unrated: 회색 gradient, "평가하기 →" CTA
□ RecordCard.not-mine: 점수 --text-hint 색상
□ WineCard: 와인 사진 어두운 gradient + 아이콘, --accent-wine 색상
□ WineCard: 버블 행 최대 2명, +N 표시
□ WineCard (셀러): 셀러 태그 + 보관 상태 + 마실 적기
□ CompactListItem: rank 1-3 accent, 4+ hint, 40x40 thumb, score 18px
□ CalendarView: 7열 그리드, 사진 배경, 점수 오버레이, 카운트 뱃지
□ CalendarView: today 강조 (box-shadow 2px accent), 선택 날짜 배경
□ CalendarView: 월 네비 ◀ ▶
□ MapView: 320px height, 28x28 핀(teardrop), 현재 위치 dot
□ MapView: 하단 compact list, "N곳" 헤더
□ PlaceBadge: 미슐랭 red, 블루리본 blue, TV black
□ 360px: 카드 좌우 16px 마진, 사진 46% 비율 유지
□ active 인터랙션: scale(0.985)
□ R1~R5 위반 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
