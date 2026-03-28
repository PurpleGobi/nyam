// src/domain/entities/profile.ts
// R1: 외부 의존 0

/** 프로필 데이터 (users 테이블 + 집계) */
export interface UserProfile {
  id: string
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  bio: string | null
  tasteSummary: string | null
  tasteTags: string[]
  totalXp: number
  activeXp: number
  activeVerified: number
  recordCount: number
  currentStreak: number
  preferredAreas: string[] | null
  createdAt: string
}

/** 프로필 활동 요약 */
export interface ActivitySummary {
  restaurantVisits: number
  wineTastings: number
  avgSatisfaction: number
  monthlyXp: number
  restaurantThisMonth: number
  wineThisMonth: number
}

/** 히트맵 셀 (13x7 그리드) */
export interface HeatmapCell {
  date: string
  count: number
  intensity: 0 | 1 | 2 | 3 | 4
}

/** 히트맵 통계 */
export interface HeatmapStats {
  totalRecords: number
  currentStreak: number
  activePeriodMonths: number
}

/** 식당 통계 패널 */
export interface RestaurantStats {
  totalVisits: number
  avgScore: number
  visitedAreas: number
  thisMonthVisits: number
  thisMonthNewAreas: number
  scoreDelta: number
}

/** 와인 통계 패널 */
export interface WineStats {
  totalTastings: number
  avgScore: number
  cellarCount: number
  thisMonthTastings: number
  thisMonthNewCellar: number
  scoreDelta: number
}

/** 장르/품종 바 차트 데이터 */
export interface BarChartItem {
  label: string
  value: number
  color?: string
}

/** 점수 분포 (6구간) */
export interface ScoreDistribution {
  range: string
  count: number
}

/** 월별 소비 */
export interface MonthlySpending {
  month: string
  label: string
  amount: number
  count?: number
}

/** 식당 지도 마커 */
export interface MapMarker {
  country: string
  city: string
  lat: number
  lng: number
  count: number
}

/** 와인 산지 지도 데이터 */
export interface WineRegionMapData {
  country: string
  countryCode: string
  totalWines: number
  typeBreakdown: { red: number; white: number; rose: number; sparkling: number }
  regions: WineRegionDetail[]
}

export interface WineRegionDetail {
  region: string
  wineCount: number
  subRegions: { name: string; count: number }[]
}

/** Wrapped 카드 데이터 */
export interface WrappedData {
  category: 'all' | 'restaurant' | 'wine'
  stats: { label: string; value: string }[]
  tags: string[]
  level: { level: number; title: string; axisLabel: string }
  topItems: { rank: number; name: string; meta: string; score: number }[]
  bubbles: { name: string; avatarColor: string }[]
}

export type WrappedCategory = 'all' | 'restaurant' | 'wine'

/** 상황별 방문 */
export interface SceneVisit {
  scene: string
  label: string
  count: number
  color: string
}

/** 와인 타입별 분포 */
export interface WineTypeDistribution {
  type: string
  label: string
  count: number
  color: string
}
