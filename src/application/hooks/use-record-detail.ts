"use client"

import useSWR from "swr"
import { getRecordRepository } from "@/di/repositories"
import type { RecordWithPhotos, RecordTasteProfile, RecordAiAnalysis } from "@/domain/entities/record"

export function useRecordDetail(recordId: string | null) {
  const { data: record, error, isLoading, mutate } = useSWR<RecordWithPhotos | null>(
    recordId ? `record-${recordId}` : null,
    () => {
      if (!recordId) return null
      return getRecordRepository().getById(recordId)
    },
  )

  const { data: tasteProfile } = useSWR<RecordTasteProfile | null>(
    recordId ? `taste-profile-${recordId}` : null,
    () => {
      if (!recordId) return null
      return getRecordRepository().getTasteProfile(recordId)
    },
  )

  const { data: aiAnalysis } = useSWR<RecordAiAnalysis | null>(
    recordId ? `ai-analysis-${recordId}` : null,
    () => {
      if (!recordId) return null
      return getRecordRepository().getAiAnalysis(recordId)
    },
  )

  return {
    record: record ?? null,
    tasteProfile: tasteProfile ?? null,
    aiAnalysis: aiAnalysis ?? null,
    isLoading,
    error: error ? String(error) : null,
    mutate,
  }
}
