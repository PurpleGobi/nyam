'use client'

import { useState, useCallback } from 'react'
import type { UserExperience, Milestone } from '@/domain/entities/xp'
import { xpRepo } from '@/shared/di/container'

export interface LevelDetailStats {
  uniqueCount: number
  totalRecords: number
  revisitCount: number
  xpBreakdown: Record<string, number>
  nextMilestone: { milestone: Milestone; currentCount: number } | null
}

const INITIAL_STATS: LevelDetailStats = {
  uniqueCount: 0,
  totalRecords: 0,
  revisitCount: 0,
  xpBreakdown: {},
  nextMilestone: null,
}

interface UseProfileLevelStatsReturn {
  stats: LevelDetailStats
  fetchStats: (exp: UserExperience) => Promise<LevelDetailStats>
}

/**
 * 프로필 레벨 상세 통계 hook
 * profileId 기준으로 경험치 축별 상세 통계를 조회
 */
export function useProfileLevelStats(profileId: string | null): UseProfileLevelStatsReturn {
  const [stats, setStats] = useState<LevelDetailStats>(INITIAL_STATS)

  const fetchStats = useCallback(async (exp: UserExperience): Promise<LevelDetailStats> => {
    if (!profileId) return INITIAL_STATS

    const [uniqueCount, totalRecords, revisitCount, xpBreakdown] = await Promise.all([
      xpRepo.getUniqueCount(profileId, exp.axisType, exp.axisValue),
      xpRepo.getTotalRecordCountByAxis(profileId, exp.axisType, exp.axisValue),
      xpRepo.getRevisitCountByAxis(profileId, exp.axisType, exp.axisValue),
      xpRepo.getXpBreakdownByAxis(profileId, exp.axisType, exp.axisValue),
    ])
    const nextMilestone = await xpRepo.getNextMilestone(exp.axisType, 'record_count', totalRecords)
    const result: LevelDetailStats = {
      uniqueCount,
      totalRecords,
      revisitCount,
      xpBreakdown,
      nextMilestone: nextMilestone ? { milestone: nextMilestone, currentCount: totalRecords } : null,
    }
    setStats(result)
    return result
  }, [profileId])

  return { stats, fetchStats }
}
