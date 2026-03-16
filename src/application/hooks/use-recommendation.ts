'use client'

import { useState, useCallback } from 'react'

interface TasteDnaInput {
  flavorSpicy: number
  flavorSweet: number
  flavorSalty: number
  flavorSour: number
  flavorUmami: number
  flavorRich: number
  tasteTypeName: string
}

interface RecommendParams {
  tasteDna: TasteDnaInput
  situation: string
  location?: string
  additionalContext?: string
}

export interface Recommendation {
  food: string
  reason: string
  tip: string
}

interface RecommendResponse {
  available: boolean
  recommendations?: Recommendation[]
  error?: string
}

export interface UseRecommendationReturn {
  getRecommendation: (params: RecommendParams) => Promise<void>
  recommendations: Recommendation[]
  isLoading: boolean
  error: string | null
  isAvailable: boolean | null
}

export function useRecommendation(): UseRecommendationReturn {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

  const getRecommendation = useCallback(async (params: RecommendParams) => {
    setIsLoading(true)
    setError(null)
    setRecommendations([])

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!res.ok) {
        throw new Error('요청에 실패했습니다')
      }

      const data: RecommendResponse = await res.json()
      setIsAvailable(data.available)

      if (!data.available) {
        return
      }

      if (data.error) {
        setError(data.error)
      }

      setRecommendations(data.recommendations ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { getRecommendation, recommendations, isLoading, error, isAvailable }
}
