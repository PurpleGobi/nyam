"use client"

import { useCallback, useState } from "react"

interface TasteDna {
  spicy: number
  sweet: number
  salty: number
  sour: number
  umami: number
  rich: number
}

interface Recommendation {
  food: string
  reason: string
  tip: string
}

interface RecommendationResponse {
  success: boolean
  recommendations: Recommendation[]
  tasteDna: TasteDna | null
  isColdStart: boolean
  sampleCount: number
  error?: string
}

export function useRecommendation() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [tasteDna, setTasteDna] = useState<TasteDna | null>(null)
  const [isColdStart, setIsColdStart] = useState(false)
  const [sampleCount, setSampleCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestRecommendation = useCallback(
    async (params: { scene?: string; location?: { lat: number; lng: number }; additionalContext?: string }) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        })

        const data: RecommendationResponse = await response.json()

        if (!response.ok || !data.success) {
          setError(data.error ?? "추천을 받지 못했어요")
          return
        }

        setRecommendations(data.recommendations)
        setTasteDna(data.tasteDna ?? null)
        setIsColdStart(data.isColdStart)
        setSampleCount(data.sampleCount)
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류")
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { recommendations, tasteDna, isColdStart, sampleCount, isLoading, error, requestRecommendation }
}
