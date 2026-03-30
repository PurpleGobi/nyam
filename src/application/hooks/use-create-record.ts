'use client'

import { useState, useCallback } from 'react'
import type { DiningRecord, CreateRecordInput } from '@/domain/entities/record'
import { recordRepo } from '@/shared/di/container'

function validateRecordInput(input: CreateRecordInput): string | null {
  if (!input.targetId) return 'targetId는 필수입니다'
  if (!input.targetType) return 'targetType은 필수입니다'
  if (input.axisX != null && (input.axisX < 0 || input.axisX > 100)) {
    return 'axisX는 0~100 범위여야 합니다'
  }
  if (input.axisY != null && (input.axisY < 0 || input.axisY > 100)) {
    return 'axisY는 0~100 범위여야 합니다'
  }
  if (input.satisfaction != null && (input.satisfaction < 1 || input.satisfaction > 100)) {
    return 'satisfaction은 1~100 범위여야 합니다'
  }
  if (input.comment && input.comment.length > 200) {
    return '코멘트는 200자 이하여야 합니다'
  }
  return null
}

export function useCreateRecord() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRecord = useCallback(
    async (input: CreateRecordInput): Promise<DiningRecord> => {
      setIsLoading(true)
      setError(null)

      const validationError = validateRecordInput(input)
      if (validationError) {
        setError(validationError)
        setIsLoading(false)
        throw new Error(validationError)
      }

      try {
        const record = await recordRepo.create(input)
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
