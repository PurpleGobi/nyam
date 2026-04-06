'use client'

import { useCallback } from 'react'
import type { DiningRecord } from '@/domain/entities/record'
import { recordRepo } from '@/shared/di/container'

/**
 * 기록 업데이트 hook — recordRepo.update 래핑.
 * record-flow-container의 handleSave(수정 모드)에서 recordRepo.update 직접 호출을 대체.
 */
export function useRecordUpdate() {
  const updateRecord = useCallback(
    (id: string, data: Partial<DiningRecord>): Promise<DiningRecord> =>
      recordRepo.update(id, data),
    [],
  )

  return { updateRecord }
}
