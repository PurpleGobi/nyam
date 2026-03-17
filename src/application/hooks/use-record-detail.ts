"use client"

import { useEffect, useRef } from "react"
import useSWR from "swr"
import { getRecordRepository } from "@/di/repositories"
import type { RecordWithPhotos, RecordTasteProfile, RecordAiAnalysis } from "@/domain/entities/record"

export function useRecordDetail(recordId: string | null) {
  const prevPhaseStatus = useRef<number | null>(null)

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
      mutateTasteProfile()
      mutateAiAnalysis()
    }
  }, [record, mutateTasteProfile, mutateAiAnalysis])

  return {
    record: record ?? null,
    tasteProfile: tasteProfile ?? null,
    aiAnalysis: aiAnalysis ?? null,
    isLoading,
    error: error ? String(error) : null,
    mutate,
  }
}
