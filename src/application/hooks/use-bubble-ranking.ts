'use client'

import { useState, useEffect } from 'react'
import type { BubbleMember } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export interface RankingEntry {
  userId: string
  role: BubbleMember['role']
  avgSatisfaction: number | null
  memberUniqueTargetCount: number
  weeklyShareCount: number
  badgeLabel: string | null
  rank: number
  delta: number
}

export function useBubbleRanking(bubbleId: string) {
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    bubbleRepo.getMembers(bubbleId).then((members) => {
      const active = members
        .filter((m) => m.status === 'active')
        .sort((a, b) => b.memberUniqueTargetCount - a.memberUniqueTargetCount)

      const ranked: RankingEntry[] = active.map((m, i) => ({
        userId: m.userId,
        role: m.role,
        avgSatisfaction: m.avgSatisfaction,
        memberUniqueTargetCount: m.memberUniqueTargetCount,
        weeklyShareCount: m.weeklyShareCount,
        badgeLabel: m.badgeLabel,
        rank: i + 1,
        delta: 0,
      }))
      setRankings(ranked)
      setIsLoading(false)
    })
  }, [bubbleId])

  return { rankings, isLoading }
}
