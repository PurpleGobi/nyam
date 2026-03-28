# S6-T2: 프로필 페이지

> SSOT: `pages/10_PROFILE.md`, `systems/XP_SYSTEM.md`, `systems/DESIGN_SYSTEM.md`, `systems/DATA_MODEL.md`
> 선행: S6-T1 (XP 엔진), S1 (DB 스키마), S2 (기록)
> 라우트: `/profile`, `/profile/wrapped`
> 목업: `prototype/03_profile.html` (screen-profile, screen-wrapped)

---

## 1. 라우팅

| 라우트 | 파일 | 역할 |
|--------|------|------|
| `/profile` | `src/app/(main)/profile/page.tsx` | ProfileContainer 렌더링만 |
| `/profile/wrapped` | `src/app/(main)/profile/wrapped/page.tsx` | WrappedContainer 렌더링만 |

---

## 2. Domain 엔티티 (추가/확장)

### `src/domain/entities/profile.ts`

```typescript
import type { UserExperience, XpHistory, LevelThreshold, Milestone, UserMilestone } from '@/domain/entities/xp';

/** 프로필 데이터 (users 테이블 + 집계) */
export interface UserProfile {
  id: string;
  nickname: string;
  handle: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  bio: string | null;
  tasteSummary: string | null;    // AI 생성 미식 정체성 텍스트
  tasteTags: string[];            // AI 생성 취향 태그
  totalXp: number;
  activeXp: number;
  activeVerified: number;
  recordCount: number;
  currentStreak: number;
  createdAt: string;
}

/** 프로필 활동 요약 */
export interface ActivitySummary {
  restaurantVisits: number;       // 식당 방문 총 수
  wineTastings: number;           // 와인 시음 총 수
  avgSatisfaction: number;        // 평균 만족도
  monthlyXp: number;             // 이번 달 획득 XP
  restaurantThisMonth: number;    // 이번 달 식당 추가
  wineThisMonth: number;          // 이번 달 와인 추가
}

/** 히트맵 셀 (13×7 그리드) */
export interface HeatmapCell {
  date: string;                   // YYYY-MM-DD
  count: number;                  // 해당 일자 기록 수
  intensity: 0 | 1 | 2 | 3 | 4;  // l0(없음)~l4(많음)
}

/** 히트맵 통계 */
export interface HeatmapStats {
  totalRecords: number;
  currentStreak: number;          // 연속 기록 일수
  activePeriodMonths: number;     // 활동 기간 (개월)
}

/** 식당 통계 패널 */
export interface RestaurantStats {
  totalVisits: number;
  avgScore: number;
  visitedAreas: number;
  thisMonthVisits: number;
  thisMonthNewAreas: number;
  scoreDelta: number;
}

/** 와인 통계 패널 */
export interface WineStats {
  totalTastings: number;
  avgScore: number;
  cellarCount: number;
  thisMonthTastings: number;
  thisMonthNewCellar: number;
  scoreDelta: number;
}

/** 장르/품종 바 차트 데이터 */
export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

/** 점수 분포 (6구간) */
export interface ScoreDistribution {
  range: string;                  // '~49' | '50s' | '60s' | '70s' | '80s' | '90s'
  count: number;
}

/** 월별 소비 */
export interface MonthlySpending {
  month: string;                  // 'YYYY-MM'
  label: string;                  // '1월' 등
  amount: number;                 // 금액 (식당: total_price SUM, 와인: purchase_price SUM)
  count?: number;                 // 와인: 병 수
}

/** 식당 지도 마커 */
export interface MapMarker {
  country: string;
  city: string;
  lat: number;
  lng: number;
  count: number;
}

/** 와인 산지 지도 데이터 */
export interface WineRegionMapData {
  country: string;
  countryCode: string;
  totalWines: number;
  typeBreakdown: { red: number; white: number; rose: number; sparkling: number };
  regions: WineRegionDetail[];
}

export interface WineRegionDetail {
  region: string;
  wineCount: number;
  subRegions: { name: string; count: number }[];
}

/** Wrapped 카드 데이터 */
export interface WrappedData {
  category: 'all' | 'restaurant' | 'wine';
  stats: { label: string; value: string }[];
  tags: string[];
  level: { level: number; title: string; axisLabel: string };
  topItems: { rank: number; name: string; meta: string; score: number }[];
  bubbles: { name: string; avatarColor: string }[];
}

/** 상황별 방문 */
export interface SceneVisit {
  scene: string;                  // DB scene 값
  label: string;                  // 한국어 라벨
  count: number;
  color: string;
}

/** 와인 타입별 분포 */
export interface WineTypeDistribution {
  type: string;                   // 'red' | 'white' | 'rose' | 'sparkling'
  label: string;
  count: number;
  color: string;
}
```

---

## 3. Domain Repository (프로필 통계)

### `src/domain/repositories/profile-repository.ts`

```typescript
import type {
  UserProfile, ActivitySummary, HeatmapCell, RestaurantStats, WineStats,
  BarChartItem, ScoreDistribution, MonthlySpending, MapMarker,
  WineRegionMapData, SceneVisit, WineTypeDistribution, WrappedData,
} from '@/domain/entities/profile';

export interface ProfileRepository {
  getUserProfile(userId: string): Promise<UserProfile>;
  getActivitySummary(userId: string): Promise<ActivitySummary>;
  getHeatmapData(userId: string, weeks: number): Promise<HeatmapCell[]>;

  // 식당 통계
  getRestaurantStats(userId: string): Promise<RestaurantStats>;
  getGenreDistribution(userId: string): Promise<BarChartItem[]>;
  getRestaurantScoreDistribution(userId: string): Promise<ScoreDistribution[]>;
  getRestaurantMonthlySpending(userId: string, months: number): Promise<MonthlySpending[]>;
  getRestaurantMapMarkers(userId: string): Promise<MapMarker[]>;
  getSceneDistribution(userId: string): Promise<SceneVisit[]>;

  // 와인 통계
  getWineStats(userId: string): Promise<WineStats>;
  getVarietyDistribution(userId: string): Promise<BarChartItem[]>;
  getWineScoreDistribution(userId: string): Promise<ScoreDistribution[]>;
  getWineMonthlySpending(userId: string, months: number): Promise<MonthlySpending[]>;
  getWineRegionMapData(userId: string): Promise<WineRegionMapData[]>;
  getWineTypeDistribution(userId: string): Promise<WineTypeDistribution[]>;

  // Wrapped
  getWrappedData(userId: string, category: 'all' | 'restaurant' | 'wine'): Promise<WrappedData>;
}
```

---

## 4. Application Hooks

### `src/application/hooks/use-profile.ts`

```typescript
import useSWR from 'swr';
import { profileRepo, xpRepo } from '@/shared/di/container';
import { useAuth } from '@/application/hooks/use-auth';

/** 프로필 전체 데이터 로드 (5~6 병렬 요청) */
export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;

  // 1. 유저 프로필 기본 정보
  const { data: profile, isLoading: profileLoading } = useSWR(
    userId ? ['profile', userId] : null,
    ([, id]) => profileRepo.getUserProfile(id),
  );

  // 2. 전체 XP 축 (5개 axis_type을 IN 절 1회로 조회)
  const { data: experiences, isLoading: xpLoading } = useSWR(
    userId ? ['experiences', userId] : null,
    ([, id]) => xpRepo.getUserExperiences(id),
  );

  // 3. 최근 XP 이력 (5개)
  const { data: recentXp, isLoading: recentXpLoading } = useSWR(
    userId ? ['recent-xp', userId] : null,
    ([, id]) => xpRepo.getRecentXpHistories(id, 5),
  );

  // 4. 활동 요약
  const { data: activitySummary, isLoading: activityLoading } = useSWR(
    userId ? ['activity-summary', userId] : null,
    ([, id]) => profileRepo.getActivitySummary(id),
  );

  // 5. 히트맵 (13주)
  const { data: heatmapData, isLoading: heatmapLoading } = useSWR(
    userId ? ['heatmap', userId] : null,
    ([, id]) => profileRepo.getHeatmapData(id, 13),
  );

  // 6. 레벨 테이블 (인메모리 캐시 — revalidateOnFocus: false)
  const { data: thresholds } = useSWR(
    'level-thresholds',
    () => xpRepo.getLevelThresholds(),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );

  const isLoading = profileLoading || xpLoading || recentXpLoading || activityLoading || heatmapLoading;

  return {
    profile,
    experiences,
    recentXp,
    activitySummary,
    heatmapData,
    thresholds,
    isLoading,
  };
}
```

### `src/application/hooks/use-profile-stats.ts`

```typescript
import useSWR from 'swr';
import { profileRepo } from '@/shared/di/container';
import { useAuth } from '@/application/hooks/use-auth';

/** 식당/와인 세부 통계 (탭 전환 시 lazy load) */
export function useRestaurantStats() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: stats } = useSWR(userId ? ['restaurant-stats', userId] : null, ([, id]) => profileRepo.getRestaurantStats(id));
  const { data: genres } = useSWR(userId ? ['genre-dist', userId] : null, ([, id]) => profileRepo.getGenreDistribution(id));
  const { data: scoreDist } = useSWR(userId ? ['rest-score-dist', userId] : null, ([, id]) => profileRepo.getRestaurantScoreDistribution(id));
  const { data: monthlySpending } = useSWR(userId ? ['rest-monthly', userId] : null, ([, id]) => profileRepo.getRestaurantMonthlySpending(id, 6));
  const { data: mapMarkers } = useSWR(userId ? ['rest-map', userId] : null, ([, id]) => profileRepo.getRestaurantMapMarkers(id));
  const { data: scenes } = useSWR(userId ? ['scene-dist', userId] : null, ([, id]) => profileRepo.getSceneDistribution(id));

  return { stats, genres, scoreDist, monthlySpending, mapMarkers, scenes };
}

export function useWineStats() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: stats } = useSWR(userId ? ['wine-stats', userId] : null, ([, id]) => profileRepo.getWineStats(id));
  const { data: varieties } = useSWR(userId ? ['variety-dist', userId] : null, ([, id]) => profileRepo.getVarietyDistribution(id));
  const { data: scoreDist } = useSWR(userId ? ['wine-score-dist', userId] : null, ([, id]) => profileRepo.getWineScoreDistribution(id));
  const { data: monthlySpending } = useSWR(userId ? ['wine-monthly', userId] : null, ([, id]) => profileRepo.getWineMonthlySpending(id, 6));
  const { data: regionMap } = useSWR(userId ? ['wine-region-map', userId] : null, ([, id]) => profileRepo.getWineRegionMapData(id));
  const { data: typeDistribution } = useSWR(userId ? ['wine-type-dist', userId] : null, ([, id]) => profileRepo.getWineTypeDistribution(id));

  return { stats, varieties, scoreDist, monthlySpending, regionMap, typeDistribution };
}
```

### `src/application/hooks/use-wrapped.ts`

```typescript
import useSWR from 'swr';
import { profileRepo } from '@/shared/di/container';
import { useAuth } from '@/application/hooks/use-auth';
import type { WrappedData } from '@/domain/entities/profile';

export function useWrapped(category: 'all' | 'restaurant' | 'wine') {
  const { user } = useAuth();
  const userId = user?.id;

  const { data } = useSWR<WrappedData>(
    userId ? ['wrapped', userId, category] : null,
    ([, id]) => profileRepo.getWrappedData(id, category),
  );

  return { data };
}
```

---

## 5. Presentation 컴포넌트 구조

### 컴포넌트 트리

```
ProfileContainer
├── ProfileHeader
│   ├── AvatarWithBadge (64px 원형, 그라디언트, 이니셜, Lv.N 뱃지)
│   └── TasteIdentityCard (AI 텍스트 + 태그 pills + 공유 버튼)
├── ActivitySection
│   ├── TotalLevelCard (레벨 + XP + 진행바)
│   ├── OverviewGrid (2×2: 식당방문/와인시음/평균점수/이번달XP)
│   ├── ActivityHeatmap (13×7 그리드 + 통계 3개)
│   └── RecentXpList (최근 XP 4~5개)
├── StatTabs (sticky, glassmorphism — [식당|와인])
│   ├── RestaurantPanel
│   │   ├── StatSummaryCards (3열: 방문/평균점수/방문지역)
│   │   ├── LevelSection (mini-tabs: [지역|장르])
│   │   │   └── LevelList (max-height 340px, 내부 스크롤)
│   │   ├── RestaurantMap (SVG 세계 지도)
│   │   ├── HorizontalBarChart (장르 분포)
│   │   ├── VerticalBarChart (점수 분포, 6구간)
│   │   ├── VerticalBarChart (월별 소비, 금액 기준)
│   │   └── HorizontalBarChart (상황별 방문)
│   └── WinePanel
│       ├── StatSummaryCards (3열: 시음수/평균점수/셀러보유)
│       ├── LevelSection (mini-tabs: [산지|품종])
│       │   └── LevelList
│       ├── WineRegionMap (3단계 드릴다운)
│       ├── HorizontalBarChart (품종, 껍질 두께 순, 토글)
│       ├── VerticalBarChart (점수 분포)
│       ├── VerticalBarChart (월별 소비, 병 수 기준)
│       └── HorizontalBarChart (타입별 분포)
└── LevelDetailSheet (바텀시트 — 축 탭 시 오픈)

WrappedContainer
├── CategoryFilter ([전체|식당|와인])
├── GaugeSlider (개인정보: 최소/보통/공개)
├── GaugeSlider (디테일: 심플/보통/상세)
└── WrappedCard (카테고리별 그라디언트 카드)
```

---

## 6. 핵심 컴포넌트 상세

### 6-1. `ProfileHeader` — `src/presentation/components/profile/profile-header.tsx`

```typescript
interface ProfileHeaderProps {
  profile: UserProfile;
  level: number;
  levelColor: string;
}
```

- 2컬럼 레이아웃: `flex gap-3`
- **좌측**: 아바타 64px 원형 + 그라디언트 배경(`avatarColor`) + 이니셜 + Lv.N 뱃지(우하단 absolute, 보라색 bg)
- **우측**: `TasteIdentityCard`

### 6-2. `TasteIdentityCard` — `src/presentation/components/profile/taste-identity-card.tsx`

```typescript
interface TasteIdentityCardProps {
  tasteSummary: string | null;
  tasteTags: string[];
  recordCount: number;
  onSharePress: () => void;       // → /profile/wrapped 이동
}
```

- 이탤릭 텍스트, 3줄 clamp (`line-clamp-3`)
- 강조 키워드: primary 색상 bold
- 태그 pills: `bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px]`
- 하단: `✨ {recordCount}개 기록 기반` + 공유 버튼 (lucide `share-2`)

### 6-3. `TotalLevelCard` — `src/presentation/components/profile/total-level-card.tsx`

```typescript
interface TotalLevelCardProps {
  level: number;
  title: string;
  color: string;
  totalXp: number;
  nextLevelXp: number;
  progress: number;               // 0~1
}
```

- 그라디언트 배경: `bg-card → primary-light`
- 아이콘: lucide `award` (24px, primary 배경 원, 흰색 아이콘)
- `{totalXp} XP · 다음 레벨까지 {nextLevelXp - totalXp} XP`
- 진행 바: 6px height, primary 색상, `rounded-full`

### 6-4. `OverviewGrid` — `src/presentation/components/profile/overview-grid.tsx`

```typescript
interface OverviewGridProps {
  summary: ActivitySummary;
}
```

- 2×2 CSS Grid: `grid-cols-2 gap-2`
- 각 카드: `rounded-xl border p-3 text-center`
- 값 색상: 식당방문=`--accent-food`, 와인시음=`--accent-wine`, 평균점수=`--text`, 이번달XP=`--positive`
- 트렌드: `+N 이번 달` (positive 색상)

### 6-5. `ActivityHeatmap` — `src/presentation/components/profile/activity-heatmap.tsx`

```typescript
interface ActivityHeatmapProps {
  data: HeatmapCell[];
  stats?: HeatmapStats;
}
```

- **상단 통계 3개**: 총 기록 / 연속 기록(caution 강조) / 활동 기간
- **그리드**: 13열 × 7행 (91셀), `display: grid; grid-template-rows: repeat(7, 1fr); grid-auto-flow: column`
- **셀**: `aspect-ratio: 1`, border-radius 2px
- **강도 매핑**: count=0 → `bg-page`, 1 → `accent-social/25%`(l1), 2 → `accent-social/50%`(l2), 3~4 → `accent-social/75%`(l3), 5+ → `accent-social/100%`(l4)
- **하단 월 라벨**: 최근 3개월 표시 (text-hint, 11px)

### 6-6. `RecentXpList` — `src/presentation/components/profile/recent-xp-list.tsx`

```typescript
interface RecentXpListProps {
  items: XpHistory[];
}
```

- 각 항목: `[아이콘] 장소명 (유형) | 축·기록 품질 태그·시간 | +XP`
- 아이콘 매핑:
  - 새 장소: lucide `sparkles`, primary-light 배경
  - 와인 기록: lucide `wine`, wine-light 배경
  - 재방문: lucide `repeat`, green-light 배경
  - 마일스톤: lucide `trophy`, gold-light 배경

### 6-7. `LevelList` — `src/presentation/components/profile/level-list.tsx`

```typescript
interface LevelListProps {
  experiences: UserExperience[];
  thresholds: LevelThreshold[];
  category: 'restaurant' | 'wine';   // 색상 구분
  onItemPress: (exp: UserExperience) => void;  // → LevelDetailSheet 오픈
}
```

- 컨테이너: `max-height: 340px; overflow-y: auto` (`.lv-list-scroll`)
- 각 아이템:
  - Lv 뱃지: 26px 정사각 라운드, 레벨 색상 bg, 흰색 텍스트
  - 축 이름 + 방문 수 (hint 색상)
  - 현재XP/다음레벨XP
  - 진행바: 4px, 레벨 색상
  - 낮은 레벨: `opacity: 0.55`
- **레벨 색상**: `getLevelColor(level)` 함수 사용

### 6-8. `LevelDetailSheet` — `src/presentation/components/profile/level-detail-sheet.tsx`

```typescript
interface LevelDetailSheetProps {
  isOpen: boolean;
  axisType: AxisType | null;
  axisValue: string | null;
  data: {
    experience: UserExperience | null;
    levelInfo: LevelInfo | null;       // 외부에서 getLevel()로 미리 계산
  };
  // 통계
  uniqueCount: number;
  totalRecords: number;
  revisitCount: number;
  xpBreakdown: Record<string, number>;  // reason → XP
  nextMilestone: { milestone: Milestone; currentCount: number } | null;
  onClose: () => void;
}
```

- 바텀시트: `max-height: 70%`, 36px 드래그 핸들
- 진행바: 8px, 레벨 색상
- 통계 3열: 고유 장소(또는 와인), 총 기록, 재방문
- XP 구성 (5항목): 새 장소 기록, 재방문, 품질 보너스, 마일스톤, 소셜
- 다음 마일스톤: lucide `target`, 진행도 + XP 보너스

### 6-9. `HorizontalBarChart` — `src/presentation/components/charts/horizontal-bar-chart.tsx`

```typescript
interface HorizontalBarChartProps {
  items: BarChartItem[];
  colorBase: string;              // primary | wine
  showToggle?: boolean;           // 품종 "마신 품종만" 토글
  onToggleChange?: (showAll: boolean) => void;
}
```

- 가로 막대: 방문 수 내림차순 정렬
- opacity 차등: 1위=1.0, 이하 점차 감소
- 장르/품종/상황별/타입별 공용

### 6-10. `VerticalBarChart` — `src/presentation/components/charts/vertical-bar-chart.tsx`

```typescript
interface VerticalBarChartProps {
  items: { label: string; value: number; highlight?: boolean }[];
  colorBase: string;
  valueLabel?: string;            // '만' (금액), '병' (와인)
  totalLabel?: string;            // '총 186만' 등
}
```

- 세로 바: 점수 분포(6구간) / 월별 소비 공용
- 최고 값 월: highlight 배경 + 색상 강조

### 6-11. `RestaurantMap` — `src/presentation/components/profile/restaurant-map.tsx`

> **S10 위임**: 제대로 된 SVG 드릴다운 지도는 `S10_maps/02_restaurant_map.md`에서 구현.
> 현재는 타원 대륙 + lat/lng 마커 간이 버전만 구현.

```typescript
interface RestaurantMapProps {
  markers: MapMarker[];
}
```

**간이 버전 (현재)**:
- 타원 대륙 배경 + lat/lng → SVG 좌표 변환 마커
- 도시 마커: 원형, primary 색상, 3단계 크기 (5/7/10px)
- 6곳+ 마커: 내부 숫자 (흰색)
- 범례: `● 1~2곳 ● 3~5곳 ● 6곳+` (opacity 차등)
- 드릴다운 없음

**S10 고도화 목표**:
- 실제 대륙/국가 SVG path
- 국가 탭 → 도시 목록 드릴다운

### 6-12. `WineRegionMap` — `src/presentation/components/profile/wine-region-map-simple.tsx`

> **S10 위임**: 3단계 드릴다운 지도는 `S10_maps/03_wine_region_map.md`에서 구현.
> 현재는 국가별 바 리스트 + 타입 도트 간이 버전만 구현.

```typescript
interface WineRegionMapSimpleProps {
  data: WineRegionMapData[];
}
```

**간이 버전 (현재)**:
- 국가별 가로 바 리스트 (와인 수 내림차순)
- 국가명 + 와인 수 + 타입별 도트 (최대 4색)
- 드릴다운 없음

**S10 고도화 목표 (3단계 드릴다운)**:

| Level | 배경 | 내용 | 인터랙션 |
|-------|------|------|----------|
| **0: 세계** | `#1a1520` (다크) | 국가 마커 (wine 색상, 크기=와인 수), 와인 도트 (레드/화이트/로제/스파클링 색상) | 국가 탭 → Level 1 |
| **1: 국가** | `#1a1520` | 국가 윤곽선, 산지별 반투명 fill, 미탐험 산지 점선 | 산지 탭 → Level 2, ← 뒤로 |
| **2: 산지** | `#1a1520` | 산지 윤곽선 + 서브 AOC, CTA 버튼 | ← 뒤로 |

와인 타입 색상:
- 레드: `#722F37`
- 화이트: `#D4C98A`
- 로제: `#E8A0B0`
- 스파클링: `#C8D8A0`

### 6-13. `WrappedCard` — `src/presentation/components/profile/wrapped-card.tsx`

```typescript
interface WrappedCardProps {
  data: WrappedData;
  gaugePrivacy: 0 | 1 | 2;       // 최소/보통/공개
  gaugeDetail: 0 | 1 | 2;        // 심플/보통/상세
  visibilityPublic: VisibilityConfig;  // visibility_public 토글 연동
}
```

카테고리별 그라디언트:

| 카테고리 | 그라디언트 | 라벨 |
|----------|-----------|------|
| 전체 | `#3D3833 → #5A4E44 → #C17B5E` | `2026` |
| 식당 | `#3D3833 → #5A4E44 → #FF6038` | 🍽 식당 |
| 와인 | `#2A2438 → #4A3D5E → #8B7396` | 🍷 와인 |

게이지 조합 매트릭스 (요소 노출 로직):

| 요소 | 개인정보 조건 | 디테일 조건 | visibility 제약 |
|------|-------------|------------|-----------------|
| 아바타 | ≥1(보통): 실제 / 0(최소): 익명 | — | — |
| 닉네임 | ≥1: 실제 / 0: "미식 탐험가" | — | — |
| 숫자 통계 | ≥1 | — | — |
| 태그 | 항상 | — | — |
| 레벨 | — | ≥1(보통) | `visibility_public.level` 필수 |
| 올해 최애 | — | =2(상세) | — |
| 버블 | =2(공개) | — | `visibility_public.bubbles` 필수 |

### 6-14. `GaugeSlider` — `src/presentation/components/profile/gauge-slider.tsx`

```typescript
interface GaugeSliderProps {
  icon: string;                   // lucide 아이콘명
  label: string;                  // '개인정보' | '디테일'
  options: string[];              // ['최소','보통','공개'] | ['심플','보통','상세']
  value: 0 | 1 | 2;
  onChange: (value: 0 | 1 | 2) => void;
}
```

- 3단 세그먼트 슬라이더
- 각 옵션 탭으로 즉시 전환

---

## 7. Containers

### `src/presentation/containers/profile-container.tsx`

```typescript
/** 프로필 전체 조합 + 데이터 fetch */
export function ProfileContainer() {
  // hooks
  const { profile, experiences, recentXp, activitySummary, heatmapData, thresholds, isLoading } = useProfile();

  // 상태
  const [activeStatTab, setActiveStatTab] = useState<'food' | 'wine'>('food');
  const [foodMiniTab, setFoodMiniTab] = useState<'region' | 'genre'>('region');
  const [wineMiniTab, setWineMiniTab] = useState<'origin' | 'grape'>('origin');
  const [levelDetailOpen, setLevelDetailOpen] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<UserExperience | null>(null);
  // showAllVarieties는 StatTabContainer로 분리

  // 레벨 산출
  const levelInfo = useMemo(() => {
    if (!profile || !thresholds) return null;
    return getLevel(profile.totalXp, thresholds);
  }, [profile, thresholds]);

  // 경험치 그룹핑 (클라이언트 사이드)
  const groupedExperiences = useMemo(() => {
    if (!experiences) return null;
    return {
      area: experiences.filter(e => e.axisType === 'area'),
      genre: experiences.filter(e => e.axisType === 'genre'),
      wineRegion: experiences.filter(e => e.axisType === 'wine_region'),
      wineVariety: experiences.filter(e => e.axisType === 'wine_variety'),
      category: experiences.filter(e => e.axisType === 'category'),
    };
  }, [experiences]);

  // 렌더링 (스타일 금지 — 컴포넌트 조합만)
  // ...
}
```

### `src/presentation/containers/wrapped-container.tsx`

```typescript
export function WrappedContainer() {
  const [category, setCategory] = useState<'all' | 'restaurant' | 'wine'>('all');
  const [gaugePrivacy, setGaugePrivacy] = useState<0 | 1 | 2>(1);
  const [gaugeDetail, setGaugeDetail] = useState<0 | 1 | 2>(1);
  const { data } = useWrapped(category);

  // 카드 이미지 렌더링 → 저장/공유
  const handleSave = useCallback(() => { /* html2canvas → blob → download */ }, []);

  // ...
}
```

---

## 8. 상태 관리 요약

| 상태 | 범위 | 타입 | 초기값 |
|------|------|------|--------|
| `activeStatTab` | ProfileContainer local | `'food' \| 'wine'` | `'food'` |
| `foodMiniTab` | ProfileContainer local | `'region' \| 'genre'` | `'region'` |
| `wineMiniTab` | ProfileContainer local | `'origin' \| 'grape'` | `'origin'` |
| `levelDetailOpen` | ProfileContainer local | `boolean` | `false` |
| `selectedExperience` | ProfileContainer local | `UserExperience \| null` | `null` |
| `showAllVarieties` | StatTabContainer local | `boolean` | `false` |
| `wrappedCategory` | WrappedContainer local | `'all' \| 'rest' \| 'wine'` | `'all'` |
| `gaugePrivacy` | WrappedContainer local | `0 \| 1 \| 2` | `1` |
| `gaugeDetail` | WrappedContainer local | `0 \| 1 \| 2` | `1` |
| `mapDrillLevel` | WineRegionMap local | `0 \| 1 \| 2` | `0` |
| `mapDrillTarget` | WineRegionMap local | `object \| null` | `null` |

---

## 9. 상황별 방문 색상 매핑

| DB `scene` 값 | 라벨 | 색상 |
|---------------|------|------|
| `solo` | 혼밥 | `#7A9BAE` |
| `romantic` | 데이트 | `#B8879B` |
| `friends` | 친구 | `#7EAE8B` |
| `family` | 가족 | `#C9A96E` |
| `business` | 회식 | `#8B7396` |
| `drinks` | 술자리 | `#B87272` |

---

## 10. 쿼리 전략 (SSOT: 10_PROFILE.md §9)

| 쿼리 | 테이블 | 방식 |
|------|--------|------|
| 유저 프로필 | `users` | `.select()` |
| 전체 XP 축 | `user_experiences` | `.select().eq('user_id').in('axis_type', [...])` — 1회 조회, 클라이언트 그룹핑 |
| 최근 XP | `xp_histories` | `.order('created_at', desc).limit(5)` |
| 마일스톤 | `user_milestones` + `milestones` | `.select('*, milestones(*)')` |
| 기록 통계 | `records` | 집계 쿼리 또는 materialized view |
| 활동 히트맵 | `records` | `.select('created_at')` → 날짜별 기록 수 |

---

## 11. 파일 체크리스트

| 파일 | 레이어 |
|------|--------|
| `src/domain/entities/profile.ts` | domain |
| `src/domain/repositories/profile-repository.ts` | domain |
| `src/infrastructure/repositories/supabase-profile-repository.ts` | infrastructure |
| `src/application/hooks/use-profile.ts` | application |
| `src/application/hooks/use-profile-stats.ts` | application |
| `src/application/hooks/use-wrapped.ts` | application |
| `src/presentation/components/profile/profile-header.tsx` | presentation |
| `src/presentation/components/profile/taste-identity-card.tsx` | presentation |
| `src/presentation/components/profile/total-level-card.tsx` | presentation |
| `src/presentation/components/profile/overview-grid.tsx` | presentation |
| `src/presentation/components/profile/activity-heatmap.tsx` | presentation |
| `src/presentation/components/profile/recent-xp-list.tsx` | presentation |
| `src/presentation/components/profile/stat-summary-cards.tsx` | presentation |
| `src/presentation/components/profile/level-list.tsx` | presentation |
| `src/presentation/components/profile/level-detail-sheet.tsx` | presentation |
| `src/presentation/components/profile/restaurant-map.tsx` | presentation |
| `src/presentation/components/profile/wine-region-map.tsx` | presentation |
| `src/presentation/components/profile/wrapped-card.tsx` | presentation |
| `src/presentation/components/profile/gauge-slider.tsx` | presentation |
| `src/presentation/components/profile/variety-toggle.tsx` | presentation |
| `src/presentation/components/charts/horizontal-bar-chart.tsx` | presentation |
| `src/presentation/components/charts/vertical-bar-chart.tsx` | presentation |
| `src/presentation/containers/profile-container.tsx` | presentation |
| `src/presentation/containers/stat-tab-container.tsx` | presentation |
| `src/presentation/containers/wrapped-container.tsx` | presentation |
| `src/app/(main)/profile/page.tsx` | app |
| `src/app/(main)/profile/wrapped/page.tsx` | app |
