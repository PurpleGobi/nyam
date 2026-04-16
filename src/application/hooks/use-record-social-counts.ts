'use client'

import { useState, useCallback } from 'react'
import { commentRepo, reactionRepo } from '@/shared/di/container'
import type { ReactionType } from '@/domain/entities/reaction'

interface RecordSocialCounts {
  commentCount: number
  reactionCounts: Record<string, number>
  myReactions: string[]
}

/**
 * 여러 recordId에 대한 댓글 수 + 리액션 카운트 + 내 리액션을 batch로 조회.
 * 버블 피드 드릴다운에서 N+1 방지용.
 */
export function useRecordSocialCounts(bubbleId: string | null) {
  const [countsMap, setCountsMap] = useState<Map<string, RecordSocialCounts>>(new Map())
  const [isLoading, setIsLoading] = useState(false)

  const loadCounts = useCallback(async (recordIds: string[], userId: string | null) => {
    if (!bubbleId || recordIds.length === 0) return
    setIsLoading(true)
    try {
      const [commentCounts, reactionCounts, userReactions] = await Promise.all([
        commentRepo.getCountsByTargetIds('record', recordIds, bubbleId),
        reactionRepo.getCountsByTargetIds('record', recordIds),
        userId ? reactionRepo.getUserReactions(userId, 'record', recordIds) : Promise.resolve([]),
      ])

      const map = new Map<string, RecordSocialCounts>()
      for (const rid of recordIds) {
        const rc = reactionCounts.get(rid) ?? { good: 0, bad: 0 }
        map.set(rid, {
          commentCount: commentCounts.get(rid) ?? 0,
          reactionCounts: rc as Record<string, number>,
          myReactions: userReactions
            .filter((r) => r.targetId === rid)
            .map((r) => r.reactionType),
        })
      }
      setCountsMap(map)
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  const getCounts = useCallback((recordId: string): RecordSocialCounts => {
    return countsMap.get(recordId) ?? { commentCount: 0, reactionCounts: {}, myReactions: [] }
  }, [countsMap])

  return { loadCounts, getCounts, isLoading }
}
