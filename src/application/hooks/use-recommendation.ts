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
  id: string
  name: string
  genre: string | null
  address: string | null
  score: number
}

interface RecommendationResponse {
  success: boolean
  recommendations: Recommendation[]
  tasteDna: TasteDna | null
  message?: string
  error?: string
}

export function useRecommendation() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [tasteDna, setTasteDna] = useState<TasteDna | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestRecommendation = useCallback(
    async (params: { scene?: string; location?: { lat: number; lng: number } }) => {
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
          setError(data.error ?? "Failed to get recommendations")
          return
        }

        setRecommendations(data.recommendations)
        setTasteDna(data.tasteDna ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { recommendations, tasteDna, isLoading, error, requestRecommendation }
}
