'use client'

import { useState, useCallback } from 'react'
import { commentRepo } from '@/shared/di/container'

export function useRecordCommentCounts() {
  const [counts, setCounts] = useState<Map<string, number>>(new Map())

  const loadCounts = useCallback(async (recordIds: string[]) => {
    if (recordIds.length === 0) return
    const result = await commentRepo.getCountsByTargetIds('record', recordIds, null)
    setCounts((prev) => {
      const next = new Map(prev)
      for (const [id, count] of result) next.set(id, count)
      return next
    })
  }, [])

  const getCount = useCallback((recordId: string): number => {
    return counts.get(recordId) ?? 0
  }, [counts])

  const adjustCount = useCallback((recordId: string, delta: number) => {
    setCounts((prev) => {
      const next = new Map(prev)
      next.set(recordId, Math.max(0, (prev.get(recordId) ?? 0) + delta))
      return next
    })
  }, [])

  return { loadCounts, getCount, adjustCount }
}
