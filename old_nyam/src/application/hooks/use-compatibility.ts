"use client"

import { useCallback, useState } from "react"

interface CompatibilityBreakdown {
  flavorSimilarity: number
}

interface CompatibilityResponse {
  success: boolean
  score?: number
  breakdown?: CompatibilityBreakdown
  error?: string
}

export function useCompatibility() {
  const [score, setScore] = useState<number | null>(null)
  const [breakdown, setBreakdown] = useState<CompatibilityBreakdown | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkCompatibility = useCallback(async (targetUserId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      })

      const data: CompatibilityResponse = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error ?? "Failed to check compatibility")
        return
      }

      setScore(data.score ?? null)
      setBreakdown(data.breakdown ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { score, breakdown, isLoading, error, checkCompatibility }
}
