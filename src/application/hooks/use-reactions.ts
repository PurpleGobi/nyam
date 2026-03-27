'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ReactionType } from '@/domain/entities/reaction'
import { reactionRepo } from '@/shared/di/container'

export function useReactions(targetType: string, targetId: string, userId: string | null) {
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    like: 0, bookmark: 0, want: 0, check: 0, fire: 0,
  })
  const [myReactions, setMyReactions] = useState<Set<ReactionType>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const loadBatch = useCallback(async () => {
    const [reactionCounts, reactions] = await Promise.all([
      reactionRepo.getCountsByTarget(targetType, targetId),
      reactionRepo.getByTarget(targetType, targetId),
    ])
    setCounts(reactionCounts)
    if (userId) {
      const mine = new Set<ReactionType>(
        reactions.filter((r) => r.userId === userId).map((r) => r.reactionType),
      )
      setMyReactions(mine)
    }
  }, [targetType, targetId, userId])

  useEffect(() => {
    loadBatch()
  }, [loadBatch])

  const toggle = useCallback(async (reactionType: ReactionType) => {
    if (!userId || isLoading) return
    setIsLoading(true)
    try {
      const result = await reactionRepo.toggle(targetType, targetId, reactionType, userId)
      setCounts((prev) => ({
        ...prev,
        [reactionType]: prev[reactionType] + (result.added ? 1 : -1),
      }))
      setMyReactions((prev) => {
        const next = new Set(prev)
        if (result.added) next.add(reactionType)
        else next.delete(reactionType)
        return next
      })
    } finally {
      setIsLoading(false)
    }
  }, [targetType, targetId, userId, isLoading])

  return { counts, myReactions, toggle, isLoading }
}
