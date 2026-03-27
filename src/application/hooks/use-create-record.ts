'use client'

import { useState, useCallback } from 'react'
import type { DiningRecord, CreateRecordInput } from '@/domain/entities/record'
import { recordRepo } from '@/shared/di/container'

export function useCreateRecord() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRecord = useCallback(
    async (input: CreateRecordInput): Promise<DiningRecord> => {
      setIsLoading(true)
      setError(null)

      try {
        const record = await recordRepo.create(input)

        await recordRepo.markWishlistVisited(
          input.userId,
          input.targetId,
          input.targetType,
        )

        return record
      } catch (err) {
        const message = err instanceof Error ? err.message : '기록 저장에 실패했습니다'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { createRecord, isLoading, error }
}
