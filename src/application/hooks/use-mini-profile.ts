'use client'

import { useState, useEffect, useCallback } from 'react'
import { profileRepo, followRepo, bubbleRepo, recordRepo } from '@/shared/di/container'
import { getLevelTitle, getLevelColor } from '@/domain/services/xp-calculator'

export interface MiniProfileBubble {
  id: string
  name: string
  icon: string | null
  iconBgColor: string | null
  memberCount: number
}

export interface MiniProfileData {
  id: string
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  bio: string | null
  tasteSummary: string | null
  tasteTags: string[]
  preferredAreas: string[]
  level: number
  levelTitle: string
  levelColor: string
  followerCount: number
  followingCount: number
  restaurantCount: number
  restaurantAvgSatisfaction: number | null
  wineCount: number
  wineAvgSatisfaction: number | null
  bubbles: MiniProfileBubble[]
  memberSince: string
}

export function useMiniProfile(targetUserId: string | null) {
  const [data, setData] = useState<MiniProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!targetUserId) return
    setIsLoading(true)
    try {
      const [profile, counts, activity, userBubbles] = await Promise.all([
        profileRepo.getUserProfile(targetUserId),
        followRepo.getCounts(targetUserId),
        profileRepo.getActivitySummary(targetUserId),
        bubbleRepo.findByUserId(targetUserId),
      ])

      const level = Math.max(1, Math.floor(profile.totalXp / 100) + 1)
      const joinDate = new Date(profile.createdAt)
      const memberSince = `${joinDate.getFullYear()}.${String(joinDate.getMonth() + 1).padStart(2, '0')}`

      // 타입별 평균 만족도: recordRepo에서 직접 조회
      const [restaurantAvg, wineAvg] = await Promise.allSettled([
        recordRepo.getAvgSatisfactionByType(targetUserId, 'restaurant'),
        recordRepo.getAvgSatisfactionByType(targetUserId, 'wine'),
      ])

      setData({
        id: profile.id,
        nickname: profile.nickname,
        handle: profile.handle,
        avatarUrl: profile.avatarUrl,
        avatarColor: profile.avatarColor,
        bio: profile.bio,
        tasteSummary: profile.tasteSummary,
        tasteTags: profile.tasteTags,
        preferredAreas: profile.preferredAreas ?? [],
        level,
        levelTitle: getLevelTitle(level),
        levelColor: getLevelColor(level),
        followerCount: counts.followers,
        followingCount: counts.following,
        restaurantCount: activity.restaurantVisits,
        restaurantAvgSatisfaction: restaurantAvg.status === 'fulfilled' ? restaurantAvg.value : null,
        wineCount: activity.wineTastings,
        wineAvgSatisfaction: wineAvg.status === 'fulfilled' ? wineAvg.value : null,
        bubbles: userBubbles
          .filter((b) => b.visibility === 'public')
          .slice(0, 5)
          .map((b) => ({
            id: b.id,
            name: b.name,
            icon: b.icon,
            iconBgColor: b.iconBgColor,
            memberCount: b.memberCount,
          })),
        memberSince,
      })
    } catch {
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [targetUserId])

  useEffect(() => {
    load()
  }, [load])

  return { data, isLoading }
}
