'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UserExperience, XpHistory, LevelThreshold, LevelInfo } from '@/domain/entities/xp'
import { getLevel } from '@/domain/services/xp-calculator'
import { xpRepo } from '@/shared/di/container'

/**
 * XP 조회 hook — 경험치, 레벨, 최근 이력을 로드.
 * @param levelOnly true이면 레벨 계산에 필요한 totalXp + thresholds만 fetch (2쿼리 → 헤더용)
 */
export function useXp(userId: string | null, levelOnly = false) {
  const [experiences, setExperiences] = useState<UserExperience[]>([])
  const [recentXp, setRecentXp] = useState<XpHistory[]>([])
  const [thresholds, setThresholds] = useState<LevelThreshold[]>([])
  const [totalXp, setTotalXp] = useState(0)
  const [isLoading, setIsLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return

    if (levelOnly) {
      // 헤더 레벨바: totalXp + thresholds만 필요 (4쿼리 → 2쿼리)
      Promise.all([
        xpRepo.getLevelThresholds(),
        xpRepo.getUserTotalXp(userId),
      ]).then(([thresh, userTotalXp]) => {
        setThresholds(thresh)
        setTotalXp(userTotalXp)
        setIsLoading(false)
      })
      return
    }

    Promise.all([
      xpRepo.getUserExperiences(userId),
      xpRepo.getLevelThresholds(),
      xpRepo.getRecentXpHistories(userId, 20),
      xpRepo.getUserTotalXp(userId),
    ]).then(([exp, thresh, recent, userTotalXp]) => {
      setExperiences(exp)
      setThresholds(thresh)
      setRecentXp(recent)
      setTotalXp(userTotalXp)
      setIsLoading(false)
    })
  }, [userId, levelOnly])

  const levelInfo: LevelInfo | null = thresholds.length > 0
    ? getLevel(totalXp, thresholds)
    : null

  const refetch = useCallback(async () => {
    if (!userId) return
    const [exp, thresh, recent, userTotalXp] = await Promise.all([
      xpRepo.getUserExperiences(userId),
      xpRepo.getLevelThresholds(),
      xpRepo.getRecentXpHistories(userId, 20),
      xpRepo.getUserTotalXp(userId),
    ])
    setExperiences(exp)
    setThresholds(thresh)
    setRecentXp(recent)
    setTotalXp(userTotalXp)
  }, [userId])

  return { experiences, recentXp, thresholds, totalXp, levelInfo, isLoading, refetch }
}
