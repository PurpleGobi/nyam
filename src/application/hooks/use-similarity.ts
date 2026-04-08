'use client'

// src/application/hooks/use-similarity.ts
// R3: domain 인터페이스에만 의존. infrastructure 직접 사용 금지.

import { useState, useEffect } from 'react'
import type { SimilarityResult } from '@/domain/entities/similarity'
import type { SimilarityCategory } from '@/domain/repositories/similarity-repository'
import { similarityRepo } from '@/shared/di/container'

interface UseSimilarityResult {
  similarity: SimilarityResult | null
  isLoading: boolean
  error: string | null
}

export function useSimilarity(
  currentUserId: string | null,
  targetUserId: string | null,
  category: SimilarityCategory,
): UseSimilarityResult {
  const [similarity, setSimilarity] = useState<SimilarityResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) return

    let cancelled = false
    setIsLoading(true)
    setError(null)
    setSimilarity(null)

    similarityRepo
      .getSimilarity(currentUserId, targetUserId, category)
      .then((result) => {
        if (!cancelled) setSimilarity(result)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '적합도 조회 실패')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [currentUserId, targetUserId, category])

  return { similarity, isLoading, error }
}
