'use client'

// src/application/hooks/use-nyam-score.ts
// R3: domain 인터페이스에만 의존. infrastructure 직접 사용 금지.

import { useState, useEffect } from 'react'
import type { PredictionWithBreakdown } from '@/domain/repositories/prediction-repository'
import type { SimilarityCategory } from '@/domain/repositories/similarity-repository'
import { predictionRepo } from '@/shared/di/container'

interface UseNyamScoreResult {
  prediction: PredictionWithBreakdown | null
  isLoading: boolean
  error: string | null
}

export function useNyamScore(
  itemId: string | null,
  category: SimilarityCategory,
  userId: string | null,
): UseNyamScoreResult {
  const [prediction, setPrediction] = useState<PredictionWithBreakdown | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!itemId || !userId) return

    let cancelled = false
    setIsLoading(true)
    setError(null)
    setPrediction(null)

    predictionRepo
      .predictScore(userId, itemId, category)
      .then((result) => {
        if (!cancelled) setPrediction(result)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Nyam 점수 조회 실패')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [itemId, category, userId])

  return { prediction, isLoading, error }
}
