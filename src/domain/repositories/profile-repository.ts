// src/domain/repositories/profile-repository.ts
// R1: 외부 의존 0

import type {
  UserProfile, ActivitySummary, HeatmapCell, RestaurantStats, WineStats,
  BarChartItem, ScoreDistribution, MonthlySpending, MapMarker,
  WineRegionMapData, SceneVisit, WineTypeDistribution, WrappedData,
  WrappedCategory,
} from '@/domain/entities/profile'

export interface BubblerProfileData {
  nickname: string
  handle?: string | null
  avatarUrl?: string | null
  avatarColor?: string | null
  level?: number
  levelTitle?: string
  tasteTags?: string[]
  categories?: { name: string; percentage: number }[]
  avgSatisfaction?: number
  totalRecords?: number
  topRegions?: string[]
  topPicks?: { id: string; name: string; targetType: 'restaurant' | 'wine'; satisfaction: number | null; thumbnailUrl: string | null; genre: string | null }[]
  recentRecords?: { id: string; targetName: string; targetType: 'restaurant' | 'wine'; satisfaction: number | null; comment: string | null; visitDate: string | null }[]
  heatmap?: HeatmapCell[]
  bubbleContext?: { bubbleId: string; bubbleName: string; bubbleIcon: string | null; rank: number | null; memberSince: string; tasteMatchPct: number | null } | null
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
  getBubblerProfile(userId: string, bubbleId: string | null): Promise<BubblerProfileData | null>
}
