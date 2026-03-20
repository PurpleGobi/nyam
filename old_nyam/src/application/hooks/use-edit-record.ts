"use client"

import { useCallback, useState } from "react"
import { getRecordRepository } from "@/di/repositories"
import type { CreateRecordInput, UpdateAiAnalysisInput, UpdateTasteProfileInput, UpdateJournalInput } from "@/domain/repositories/record-repository"
import type { PhotoCropData } from "@/domain/entities/record"

export function useEditRecord() {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateRecord = useCallback(async (id: string, data: Partial<CreateRecordInput>) => {
    setIsUpdating(true)
    try {
      return await getRecordRepository().update(id, data)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const deleteRecord = useCallback(async (id: string) => {
    setIsUpdating(true)
    try {
      await getRecordRepository().delete(id)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const updateAiAnalysis = useCallback(async (recordId: string, data: UpdateAiAnalysisInput) => {
    setIsUpdating(true)
    try {
      await getRecordRepository().updateAiAnalysis(recordId, data)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const updateTasteProfile = useCallback(async (recordId: string, data: UpdateTasteProfileInput) => {
    setIsUpdating(true)
    try {
      await getRecordRepository().updateTasteProfile(recordId, data)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const updateJournal = useCallback(async (recordId: string, data: UpdateJournalInput) => {
    setIsUpdating(true)
    try {
      await getRecordRepository().updateJournal(recordId, data)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const updatePhotoCrop = useCallback(async (photoId: string, cropData: PhotoCropData | null) => {
    await getRecordRepository().updatePhotoCrop(photoId, cropData)
  }, [])

  return { updateRecord, deleteRecord, updateAiAnalysis, updateTasteProfile, updateJournal, updatePhotoCrop, isUpdating }
}
