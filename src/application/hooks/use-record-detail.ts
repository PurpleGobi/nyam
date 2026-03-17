"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { getRecordRepository } from "@/di/repositories"
import type { RecordWithPhotos, RecordTasteProfile, RecordAiAnalysis } from "@/domain/entities/record"

const ANALYSIS_TIMEOUT_MS = 90_000

export function useRecordDetail(recordId: string | null) {
  const prevPhaseStatus = useRef<number | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isAnalysisTimedOut, setIsAnalysisTimedOut] = useState(false)

  const { data: record, error, isLoading, mutate } = useSWR<RecordWithPhotos | null>(
    recordId ? `record-${recordId}` : null,
    () => {
      if (!recordId) return null
      return getRecordRepository().getById(recordId)
    },
    {
      // Poll every 3s while AI is still processing (phaseStatus === 1)
      refreshInterval: (latestData) => {
        if (latestData && latestData.phaseStatus < 2) return 3000
        return 0
      },
    },
  )

  const { data: tasteProfile, mutate: mutateTasteProfile } = useSWR<RecordTasteProfile | null>(
    recordId ? `taste-profile-${recordId}` : null,
    () => {
      if (!recordId) return null
      return getRecordRepository().getTasteProfile(recordId)
    },
  )

  const { data: aiAnalysis, mutate: mutateAiAnalysis } = useSWR<RecordAiAnalysis | null>(
    recordId ? `ai-analysis-${recordId}` : null,
    () => {
      if (!recordId) return null
      return getRecordRepository().getAiAnalysis(recordId)
    },
  )

  // Detect phase transition 1 → 2 and revalidate related data
  useEffect(() => {
    if (!record) return
    const prev = prevPhaseStatus.current
    prevPhaseStatus.current = record.phaseStatus

    if (prev === 1 && record.phaseStatus >= 2) {
      setIsAnalysisTimedOut(false)
      mutateTasteProfile()
      mutateAiAnalysis()
    }
  }, [record, mutateTasteProfile, mutateAiAnalysis])

  // Detect stuck analysis (phase_status=1 for too long)
  useEffect(() => {
    if (!record || record.phaseStatus >= 2 || isRetrying) {
      setIsAnalysisTimedOut(false)
      return
    }
    const elapsed = Date.now() - new Date(record.createdAt).getTime()
    if (elapsed >= ANALYSIS_TIMEOUT_MS) {
      setIsAnalysisTimedOut(true)
      return
    }
    const remaining = ANALYSIS_TIMEOUT_MS - elapsed
    const timer = setTimeout(() => setIsAnalysisTimedOut(true), remaining)
    return () => clearTimeout(timer)
  }, [record, isRetrying])

  const retryAnalysis = useCallback(async () => {
    if (!record || isRetrying) return
    setIsRetrying(true)
    setIsAnalysisTimedOut(false)

    try {
      const photoUrls = record.photos.map((p) => p.photoUrl)

      if (record.recordType !== "cooking" && photoUrls.length > 0) {
        await fetch("/api/records/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId: record.id, photoUrls }),
        }).catch(() => {/* non-fatal */})

        await fetch("/api/records/taste-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId: record.id }),
        }).catch(() => {/* non-fatal */})
      }

      await fetch("/api/records/post-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: record.id }),
      })

      await mutate()
      mutateTasteProfile()
      mutateAiAnalysis()
    } finally {
      setIsRetrying(false)
    }
  }, [record, isRetrying, mutate, mutateTasteProfile, mutateAiAnalysis])

  return {
    record: record ?? null,
    tasteProfile: tasteProfile ?? null,
    aiAnalysis: aiAnalysis ?? null,
    isLoading,
    isRetrying,
    isAnalysisTimedOut,
    retryAnalysis,
    error: error ? String(error) : null,
    mutate,
  }
}
