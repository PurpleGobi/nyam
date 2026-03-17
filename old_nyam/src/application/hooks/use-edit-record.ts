'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import type { FoodRecord } from '@/domain/entities/record'
import { getRecordRepository } from '@/di/repositories'

interface UseEditRecordReturn {
  record: FoodRecord | null | undefined
  saveChanges: (updates: Partial<FoodRecord>) => Promise<void>
  isLoading: boolean
  isSaving: boolean
  error: string | null
}

export function useEditRecord(recordId: string | undefined): UseEditRecordReturn {
  const repo = getRecordRepository()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: record, isLoading, mutate } = useSWR(
    recordId ? ['record', recordId] : null,
    () => repo.getById(recordId!),
  )

  const saveChanges = useCallback(async (updates: Partial<FoodRecord>) => {
    if (!recordId) return
    setIsSaving(true)
    setError(null)
    try {
      const updated = await repo.update(recordId, updates)
      await mutate(updated, { revalidate: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes'
      setError(message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [recordId, repo, mutate])

  return {
    record,
    saveChanges,
    isLoading,
    isSaving,
    error,
  }
}
