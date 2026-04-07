'use client'

import { useState, useEffect } from 'react'
import type { AccessLevel } from '@/domain/entities/follow'
import type { HeatmapCell } from '@/domain/entities/profile'
import type { BubblerPickItem, BubblerRecentRecord, BubblerBubbleContext } from '@/domain/repositories/profile-repository'
import { profileRepo, followRepo } from '@/shared/di/container'
import { getAccessLevel } from '@/domain/services/follow-access'

interface CategoryStat {
  name: string
  percentage: number
}

interface BubblerProfileData {
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  bio: string | null
  level: number
  levelTitle: string
  accessLevel: AccessLevel
  tasteTags: string[]
  categories: CategoryStat[]
  avgSatisfaction: number
  scoreTendencyLabel: string
  totalRecords: number
  topRegions: string[]
  topPicks: BubblerPickItem[]
  recentRecords: BubblerRecentRecord[]
  heatmap: HeatmapCell[]
  bubbleContext: BubblerBubbleContext | null
  currentStreak: number
  activeDuration: string
}

type ProfileTab = 'restaurant' | 'wine'

interface UseBubblerProfileResult {
  data: BubblerProfileData | null
  isLoading: boolean
  activeTab: ProfileTab
  setActiveTab: (tab: ProfileTab) => void
}

export function useBubblerProfile(
  currentUserId: string | null,
  targetUserId: string,
  bubbleId: string | null,
): UseBubblerProfileResult {
  const [data, setData] = useState<BubblerProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ProfileTab>('restaurant')

  // 탭 전환 + 초기 로드 모두 데이터 재조회
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

        const profile = await profileRepo.getBubblerProfile(targetUserId, bubbleId, activeTab)
        if (!profile) {
          setData(null)
          return
        }

        // accessLevel이 'none'이면 프로필 민감 데이터를 숨김
        const isRestricted = accessLevel === 'none'

        setData({
          nickname: profile.nickname,
          handle: isRestricted ? null : (profile.handle ?? null),
          avatarUrl: isRestricted ? null : (profile.avatarUrl ?? null),
          avatarColor: profile.avatarColor ?? null,
          bio: isRestricted ? null : (profile.bio ?? null),
          level: profile.level ?? 1,
          levelTitle: profile.levelTitle ?? '입문자',
          accessLevel,
          tasteTags: isRestricted ? [] : (profile.tasteTags ?? []),
          categories: isRestricted ? [] : (profile.categories ?? []),
          avgSatisfaction: isRestricted ? 0 : (profile.avgSatisfaction ?? 0),
          scoreTendencyLabel: isRestricted ? '-' : (profile.scoreTendencyLabel ?? '-'),
          totalRecords: isRestricted ? 0 : (profile.totalRecords ?? 0),
          topRegions: isRestricted ? [] : (profile.topRegions ?? []),
          topPicks: isRestricted ? [] : (profile.topPicks ?? []),
          recentRecords: isRestricted ? [] : (profile.recentRecords ?? []),
          heatmap: isRestricted ? [] : (profile.heatmap ?? []),
          bubbleContext: profile.bubbleContext ?? null,
          currentStreak: isRestricted ? 0 : (profile.currentStreak ?? 0),
          activeDuration: isRestricted ? '-' : (profile.activeDuration ?? '-'),
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [currentUserId, targetUserId, bubbleId, activeTab])

  return { data, isLoading, activeTab, setActiveTab }
}
