// src/domain/repositories/profile-repository.ts
// R1: 외부 의존 0

import type { ActivitySummary, HeatmapCell, RestaurantStats, WineStats, WrappedData, WrappedCategory } from '@/domain/entities/profile'

export interface BubblerProfileData {
  nickname: string
  handle?: string | null
  avatarUrl?: string | null
  avatarColor?: string | null
  level?: number
  levelTitle?: string
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
  getActivitySummary(userId: string): Promise<ActivitySummary>
  getHeatmap(userId: string, weeks: number): Promise<HeatmapCell[]>
  getRestaurantStats(userId: string): Promise<RestaurantStats>
  getWineStats(userId: string): Promise<WineStats>
  getWrappedData(userId: string, category: WrappedCategory): Promise<WrappedData>
  getBubblerProfile(userId: string, bubbleId: string | null): Promise<BubblerProfileData | null>
}
