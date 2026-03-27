'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UserExperience, LevelThreshold, LevelInfo } from '@/domain/entities/xp'
import { getLevel } from '@/domain/services/xp-calculator'
import { xpRepo } from '@/shared/di/container'

export function useXp(userId: string | null) {
  const [experiences, setExperiences] = useState<UserExperience[]>([])
  const [thresholds, setThresholds] = useState<LevelThreshold[]>([])
  const [totalXp, setTotalXp] = useState(0)
  const [isLoading, setIsLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return

    Promise.all([
      xpRepo.getExperiences(userId),
      xpRepo.getLevelThresholds(),
    ]).then(([exp, thresh]) => {
      setExperiences(exp)
      setThresholds(thresh)
      setTotalXp(exp.reduce((sum, e) => sum + e.totalXp, 0))
      setIsLoading(false)
    })
  }, [userId])

  const levelInfo: LevelInfo | null = thresholds.length > 0
    ? getLevel(totalXp, thresholds)
    : null

  const refetch = useCallback(async () => {
    if (!userId) return
    const [exp, thresh] = await Promise.all([
      xpRepo.getExperiences(userId),
      xpRepo.getLevelThresholds(),
    ])
    setExperiences(exp)
    setThresholds(thresh)
    setTotalXp(exp.reduce((sum, e) => sum + e.totalXp, 0))
  }, [userId])

  return { experiences, thresholds, totalXp, levelInfo, isLoading, refetch }
}
