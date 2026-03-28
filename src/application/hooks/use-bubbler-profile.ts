'use client'

import { useState, useEffect } from 'react'
import type { AccessLevel } from '@/domain/entities/follow'
import type { HeatmapCell } from '@/domain/entities/profile'
import { profileRepo, followRepo } from '@/shared/di/container'
import { getAccessLevel } from '@/domain/services/follow-access'

interface CategoryStat {
  name: string
  percentage: number
}

interface PickItem {
  id: string
  name: string
  targetType: 'restaurant' | 'wine'
  satisfaction: number | null
  thumbnailUrl: string | null
  genre: string | null
}

interface RecentRecordItem {
  id: string
  targetName: string
  targetType: 'restaurant' | 'wine'
  satisfaction: number | null
  comment: string | null
  visitDate: string | null
}

interface BubbleContext {
  bubbleId: string
  bubbleName: string
  bubbleIcon: string | null
  rank: number | null
  memberSince: string
  tasteMatchPct: number | null
}

interface BubblerProfileData {
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  level: number
  levelTitle: string
  accessLevel: AccessLevel
  tasteTags: string[]
  categories: CategoryStat[]
  avgSatisfaction: number
  totalRecords: number
  topRegions: string[]
  topPicks: PickItem[]
  recentRecords: RecentRecordItem[]
  heatmap: HeatmapCell[]
  bubbleContext: BubbleContext | null
}

interface UseBubblerProfileResult {
  data: BubblerProfileData | null
  isLoading: boolean
}

export function useBubblerProfile(
  currentUserId: string | null,
  targetUserId: string,
  bubbleId: string | null,
): UseBubblerProfileResult {
  const [data, setData] = useState<BubblerProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!targetUserId) return

    setIsLoading(true)

    const fetchProfile = async () => {
      try {
        let accessLevel: AccessLevel = 'none'
        if (currentUserId && currentUserId !== targetUserId) {
          const [iFollow, theyFollow] = await Promise.all([
            followRepo.getAccessLevel(currentUserId, targetUserId).then((l) => l !== 'none'),
            followRepo.getAccessLevel(targetUserId, currentUserId).then((l) => l !== 'none'),
          ])
          accessLevel = getAccessLevel(iFollow, theyFollow)
        } else if (currentUserId === targetUserId) {
          accessLevel = 'mutual'
        }

        const profile = await profileRepo.getBubblerProfile(targetUserId, bubbleId)
        if (!profile) {
          setData(null)
          return
        }

        setData({
          nickname: profile.nickname,
          handle: profile.handle ?? null,
          avatarUrl: profile.avatarUrl ?? null,
          avatarColor: profile.avatarColor ?? null,
          level: profile.level ?? 1,
          levelTitle: profile.levelTitle ?? '입문자',
          accessLevel,
          tasteTags: profile.tasteTags ?? [],
          categories: profile.categories ?? [],
          avgSatisfaction: profile.avgSatisfaction ?? 0,
          totalRecords: profile.totalRecords ?? 0,
          topRegions: profile.topRegions ?? [],
          topPicks: profile.topPicks ?? [],
          recentRecords: profile.recentRecords ?? [],
          heatmap: profile.heatmap ?? [],
          bubbleContext: profile.bubbleContext ?? null,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [currentUserId, targetUserId, bubbleId])

  return { data, isLoading }
}
