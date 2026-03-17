"use client"

import { useCallback, useState } from "react"

interface GeneratedReview {
  title: string
  body: string
  highlights: string[]
}

interface GenerateReviewResponse {
  success: boolean
  review?: GeneratedReview
  error?: string
}

export function useRecordCompletion() {
  const [review, setReview] = useState<GeneratedReview | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateReview = useCallback(async (recordId: string) => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch("/api/records/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId }),
      })

      const data: GenerateReviewResponse = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error ?? "Failed to generate review")
        return
      }

      setReview(data.review ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { review, isGenerating, error, generateReview }
}
