'use client'

import { useState, useCallback } from 'react'
import type { ReactionType } from '@/domain/entities/reaction'
import { reactionRepo } from '@/shared/di/container'

interface RecordReactionState {
  counts: Record<ReactionType, number>
  myReactions: Set<string>
}

const DEFAULT_STATE: RecordReactionState = {
  counts: { good: 0, bad: 0 },
  myReactions: new Set(),
}

export function useRecordReactions(userId: string | null) {
  const [stateMap, setStateMap] = useState<Map<string, RecordReactionState>>(new Map())
  const [isLoading, setIsLoading] = useState(false)

  const loadCounts = useCallback(async (recordIds: string[]) => {
    if (recordIds.length === 0) return
    setIsLoading(true)
    try {
      const [reactionCounts, userReactions] = await Promise.all([
        reactionRepo.getCountsByTargetIds('record', recordIds),
        userId ? reactionRepo.getUserReactions(userId, 'record', recordIds) : Promise.resolve([]),
      ])
      const map = new Map<string, RecordReactionState>()
      for (const rid of recordIds) {
        const rc = reactionCounts.get(rid) ?? { good: 0, bad: 0 }
        map.set(rid, {
          counts: rc,
          myReactions: new Set(userReactions.filter((r) => r.targetId === rid).map((r) => r.reactionType)),
        })
      }
      setStateMap(map)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const getCounts = useCallback((recordId: string): RecordReactionState => {
    return stateMap.get(recordId) ?? DEFAULT_STATE
  }, [stateMap])

  const toggle = useCallback(async (recordId: string, reactionType: ReactionType) => {
    if (!userId) return
    // 낙관적 업데이트 (good↔bad 상호 배타)
    setStateMap((prev) => {
      const next = new Map(prev)
      const current = next.get(recordId) ?? { counts: { good: 0, bad: 0 }, myReactions: new Set<string>() }
      const willAdd = !current.myReactions.has(reactionType)
      const opposite: ReactionType = reactionType === 'good' ? 'bad' : 'good'
      const hadOpposite = current.myReactions.has(opposite)
      const newMyReactions = new Set(current.myReactions)
      if (willAdd) {
        newMyReactions.add(reactionType)
        newMyReactions.delete(opposite)
      } else {
        newMyReactions.delete(reactionType)
      }
      next.set(recordId, {
        counts: {
          ...current.counts,
          [reactionType]: Math.max(0, current.counts[reactionType] + (willAdd ? 1 : -1)),
          ...(willAdd && hadOpposite ? { [opposite]: Math.max(0, current.counts[opposite] - 1) } : {}),
        },
        myReactions: newMyReactions,
      })
      return next
    })
    try {
      await reactionRepo.toggle('record', recordId, reactionType, userId)
    } catch {
      // 실패 시 재로드
      loadCounts([recordId])
    }
  }, [userId, loadCounts])

  // 외부(바텀시트 등)에서 리액션 변경 시 카드 상태 동기화
  const syncReaction = useCallback((recordId: string, reactionType: ReactionType, added: boolean) => {
    setStateMap((prev) => {
      const next = new Map(prev)
      const current = next.get(recordId) ?? { counts: { good: 0, bad: 0 }, myReactions: new Set<string>() }
      const opposite: ReactionType = reactionType === 'good' ? 'bad' : 'good'
      const hadOpposite = current.myReactions.has(opposite)
      const newMyReactions = new Set(current.myReactions)
      if (added) {
        newMyReactions.add(reactionType)
        newMyReactions.delete(opposite)
      } else {
        newMyReactions.delete(reactionType)
      }
      next.set(recordId, {
        counts: {
          ...current.counts,
          [reactionType]: Math.max(0, current.counts[reactionType] + (added ? 1 : -1)),
          ...(added && hadOpposite ? { [opposite]: Math.max(0, current.counts[opposite] - 1) } : {}),
        },
        myReactions: newMyReactions,
      })
      return next
    })
  }, [])

  return { loadCounts, getCounts, toggle, syncReaction, isLoading }
}
