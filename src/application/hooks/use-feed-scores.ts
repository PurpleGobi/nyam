'use client'

// src/application/hooks/use-feed-scores.ts
// R3: domain 인터페이스에만 의존. infrastructure 직접 사용 금지.

import { useState, useEffect } from 'react'
import type { SimilarityCategory } from '@/domain/repositories/similarity-repository'
import { predictionRepo } from '@/shared/di/container'

interface FeedScore {
  satisfaction: number
  confidence: number
}

interface UseFeedScoresResult {
  scores: Map<string, FeedScore>
  isLoading: boolean
  error: string | null
}

export function useFeedScores(
  itemIds: string[],
  category: SimilarityCategory,
  userId: string | null,
): UseFeedScoresResult {
  const [scores, setScores] = useState<Map<string, FeedScore>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // itemIds는 배열이므로 join으로 안정적인 deps 생성
  const itemIdsKey = itemIds.join(',')

  useEffect(() => {
    if (!userId || itemIds.length === 0) {
      setScores(new Map())
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    predictionRepo
      .batchPredict(userId, itemIds, category)
      .then((result) => {
        if (!cancelled) setScores(result)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '피드 점수 조회 실패')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, itemIdsKey, category])

  return { scores, isLoading, error }
}
