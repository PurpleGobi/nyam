'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DiningRecord, RecordTargetType } from '@/domain/entities/record'
import { recordRepo } from '@/shared/di/container'

export function useRecords(userId: string | null, targetType?: RecordTargetType) {
  const [records, setRecords] = useState<DiningRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)

    try {
      const data = await recordRepo.findByUserId(userId, targetType)
      setRecords(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '기록 조회에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [userId, targetType])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  return { records, isLoading, error, refetch: fetchRecords }
}
