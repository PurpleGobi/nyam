'use client'

import { useCallback, useState } from 'react'
import { getRecordRepository } from '@/di/repositories'
import type { FoodRecord } from '@/domain/entities/record'

export function useRecordActions() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const repo = getRecordRepository()

  const deleteRecord = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await repo.delete(id)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete record'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [repo])

  const updateRecord = useCallback(async (id: string, data: Partial<FoodRecord>) => {
    setIsLoading(true)
    setError(null)
    try {
      const updated = await repo.update(id, data)
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update record'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [repo])

  return { deleteRecord, updateRecord, isLoading, error }
}
