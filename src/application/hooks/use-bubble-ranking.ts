'use client'

import { useState, useEffect, useMemo } from 'react'
import type { BubbleRankingSnapshot, RankingTargetType } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export type DeltaDirection = 'up' | 'down' | 'new' | 'same'

export interface RankingDelta {
  value: number | 'new' | null
  direction: DeltaDirection
}

export interface RankingEntry {
  targetId: string
  targetType: RankingTargetType
  rankPosition: number
  avgSatisfaction: number | null
  recordCount: number
  delta: RankingDelta
}

function getThisWeekMonday(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const offset = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setUTCDate(monday.getUTCDate() - offset)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

function getLastWeekMonday(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const offset = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setUTCDate(monday.getUTCDate() - offset - 7)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

function calculateDelta(
  currentRank: number,
  previousSnapshots: BubbleRankingSnapshot[],
  targetId: string,
  targetType: string,
): RankingDelta {
  const prev = previousSnapshots.find(
    (s) => s.targetId === targetId && s.targetType === targetType,
  )

  if (!prev) {
    return { value: 'new', direction: 'new' }
  }

  const diff = prev.rankPosition - currentRank
  if (diff === 0) {
    return { value: null, direction: 'same' }
  }
  return {
    value: Math.abs(diff),
    direction: diff > 0 ? 'up' : 'down',
  }
}

export function useBubbleRanking(bubbleId: string, targetType: RankingTargetType) {
  const [currentSnapshots, setCurrentSnapshots] = useState<BubbleRankingSnapshot[]>([])
  const [previousSnapshots, setPreviousSnapshots] = useState<BubbleRankingSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const thisWeekMonday = useMemo(() => getThisWeekMonday(), [])
  const lastWeekMonday = useMemo(() => getLastWeekMonday(), [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [current, previous] = await Promise.all([
        bubbleRepo.getRankings(bubbleId, { targetType, periodStart: thisWeekMonday }),
        bubbleRepo.getPreviousRankings(bubbleId, targetType, lastWeekMonday),
      ])
      if (!cancelled) {
        setCurrentSnapshots(current)
        setPreviousSnapshots(previous)
        setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [bubbleId, targetType, thisWeekMonday, lastWeekMonday])

  const rankings: RankingEntry[] = useMemo(() => {
    return currentSnapshots.map((snap) => ({
      targetId: snap.targetId,
      targetType: snap.targetType,
      rankPosition: snap.rankPosition,
      avgSatisfaction: snap.avgSatisfaction,
      recordCount: snap.recordCount,
      delta: calculateDelta(snap.rankPosition, previousSnapshots, snap.targetId, snap.targetType),
    }))
  }, [currentSnapshots, previousSnapshots])

  return { rankings, isLoading }
}
