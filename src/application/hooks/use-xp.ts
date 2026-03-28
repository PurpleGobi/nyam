'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UserExperience, XpHistory, LevelThreshold, LevelInfo } from '@/domain/entities/xp'
import { getLevel } from '@/domain/services/xp-calculator'
import { xpRepo } from '@/shared/di/container'

/**
 * XP 조회 hook — 경험치, 레벨, 최근 이력을 로드.
 */
export function useXp(userId: string | null) {
  const [experiences, setExperiences] = useState<UserExperience[]>([])
  const [recentXp, setRecentXp] = useState<XpHistory[]>([])
  const [thresholds, setThresholds] = useState<LevelThreshold[]>([])
  const [totalXp, setTotalXp] = useState(0)
  const [isLoading, setIsLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return

    Promise.all([
      xpRepo.getUserExperiences(userId),
      xpRepo.getLevelThresholds(),
      xpRepo.getRecentXpHistories(userId, 20),
    ]).then(([exp, thresh, recent]) => {
      setExperiences(exp)
      setThresholds(thresh)
      setRecentXp(recent)
      setTotalXp(exp.reduce((sum, e) => sum + e.totalXp, 0))
      setIsLoading(false)
    })
  }, [userId])

  const levelInfo: LevelInfo | null = thresholds.length > 0
    ? getLevel(totalXp, thresholds)
    : null

  const refetch = useCallback(async () => {
    if (!userId) return
    const [exp, thresh, recent] = await Promise.all([
      xpRepo.getUserExperiences(userId),
      xpRepo.getLevelThresholds(),
      xpRepo.getRecentXpHistories(userId, 20),
    ])
    setExperiences(exp)
    setThresholds(thresh)
    setRecentXp(recent)
    setTotalXp(exp.reduce((sum, e) => sum + e.totalXp, 0))
  }, [userId])

  return { experiences, recentXp, thresholds, totalXp, levelInfo, isLoading, refetch }
}
