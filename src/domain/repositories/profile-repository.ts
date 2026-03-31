// src/domain/repositories/profile-repository.ts
// R1: 외부 의존 0

import type {
  UserProfile, ActivitySummary, HeatmapCell, RestaurantStats, WineStats,
  BarChartItem, ScoreDistribution, MonthlySpending, MapMarker,
  WineRegionMapData, SceneVisit, WineTypeDistribution, WrappedData,
  WrappedCategory,
} from '@/domain/entities/profile'

export interface BubblerPickItem {
  id: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string                    // "일식 · 광화문" 또는 "레드 · 보르도"
  satisfaction: number | null
  photoUrl: string | null
  genre: string | null
}

export interface BubblerRecentRecord {
  id: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  targetName: string
  meta: string                    // "한식 · 을지로 · 3일 전"
  satisfaction: number | null
  comment: string | null
  photoUrl: string | null
  visitDate: string | null
}

export interface BubblerBubbleContext {
  bubbleId: string
  bubbleName: string
  bubbleIcon: string | null
  rank: number | null
  rankTotal: number | null
  memberSince: string
  tasteMatchPct: number | null
  tasteMatchCount: number | null
  tasteMatchDetail: string | null  // "78% (9/12곳 일치)"
  commonTargetCount: number
}

export interface BubblerProfileData {
  nickname: string
  handle?: string | null
  avatarUrl?: string | null
  avatarColor?: string | null
  bio?: string | null
  level?: number
  levelTitle?: string
  tasteTags?: string[]
  categories?: { name: string; percentage: number }[]
  avgSatisfaction?: number
  scoreTendencyLabel?: string      // "조금 후한 편"
  totalRecords?: number
  topRegions?: string[]
  topPicks?: BubblerPickItem[]
  recentRecords?: BubblerRecentRecord[]
  heatmap?: HeatmapCell[]
  bubbleContext?: BubblerBubbleContext | null
  currentStreak?: number
  activeDuration?: string
}

export interface ProfileRepository {
  getUserProfile(userId: string): Promise<UserProfile>
  getActivitySummary(userId: string): Promise<ActivitySummary>
  getHeatmapData(userId: string, weeks: number): Promise<HeatmapCell[]>

  // 식당 통계
  getRestaurantStats(userId: string): Promise<RestaurantStats>
  getGenreDistribution(userId: string): Promise<BarChartItem[]>
  getRestaurantScoreDistribution(userId: string): Promise<ScoreDistribution[]>
  getRestaurantMonthlySpending(userId: string, months: number): Promise<MonthlySpending[]>
  getRestaurantMapMarkers(userId: string): Promise<MapMarker[]>
  getSceneDistribution(userId: string): Promise<SceneVisit[]>

  // 와인 통계
  getWineStats(userId: string): Promise<WineStats>
  getVarietyDistribution(userId: string): Promise<BarChartItem[]>
  getWineScoreDistribution(userId: string): Promise<ScoreDistribution[]>
  getWineMonthlySpending(userId: string, months: number): Promise<MonthlySpending[]>
  getWineRegionMapData(userId: string): Promise<WineRegionMapData[]>
  getWineTypeDistribution(userId: string): Promise<WineTypeDistribution[]>

  // Wrapped
  getWrappedData(userId: string, category: WrappedCategory): Promise<WrappedData>

  // 버블러 프로필
  getBubblerProfile(userId: string, bubbleId: string | null, targetType?: 'restaurant' | 'wine'): Promise<BubblerProfileData | null>
}
