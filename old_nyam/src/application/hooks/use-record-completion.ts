"use client"

import { useCallback, useState } from "react"

export interface ReviewQuestion {
  id: string
  question: string
  options?: string[]
  type: "select" | "freetext"
}

export interface BlogSection {
  type: "text" | "photo"
  content: string
  photoIndex?: number
  caption?: string
}

export interface GeneratedBlog {
  title: string
  sections: BlogSection[]
  tags: string[]
}

export type CompletionStage = "questions" | "generating" | "preview" | "complete"

export function useRecordCompletion() {
  const [stage, setStage] = useState<CompletionStage>("questions")
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState(0)
  const [blog, setBlog] = useState<GeneratedBlog | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuestions = useCallback(async (recordId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/records/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error ?? "Failed to generate questions")
        return
      }

      setQuestions(data.questions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const setAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }, [])

  const goNext = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, questions.length - 1))
  }, [questions.length])

  const goPrev = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  const generateBlog = useCallback(async (recordId: string) => {
    setStage("generating")
    setError(null)

    try {
      const response = await fetch("/api/records/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, answers }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error ?? "Failed to generate blog")
        setStage("questions")
        return
      }

      setBlog(data.blog)
      setStage("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setStage("questions")
    }
  }, [answers])

  const completeReview = useCallback(() => {
    setStage("complete")
  }, [])

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id]?.trim())

  return {
    stage,
    questions,
    answers,
    currentStep,
    blog,
    isLoading,
    error,
    allAnswered,
    fetchQuestions,
    setAnswer,
    goNext,
    goPrev,
    generateBlog,
    completeReview,
  }
}
