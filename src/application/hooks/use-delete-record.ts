'use client'

import { useState, useCallback } from 'react'
import type { RecordTargetType } from '@/domain/entities/record'
import { recordRepo, xpRepo, bubbleRepo } from '@/shared/di/container'

export interface DeleteResult {
  sharesCount: number
  remainingCount: number
}

/**
 * 기록 삭제 hook — 3곳(restaurant-detail, wine-detail, record-flow)의 중복 삭제 로직 통합.
 * 삭제 시 XP 회수 + 버블 공유 정리 + 남은 기록 수 확인.
 */
export function useDeleteRecord() {
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteRecord = useCallback(
    async (
      recordId: string,
      userId: string,
      targetId: string,
      _targetType: RecordTargetType,
    ): Promise<DeleteResult> => {
      setIsDeleting(true)
      try {
        // 삭제 전 정보 수집 (CASCADE 삭제 대비)
        const [histories, shares] = await Promise.all([
          xpRepo.getHistoriesByRecord(recordId),
          bubbleRepo.getRecordShares(recordId).catch(() => []),
        ])

        await recordRepo.delete(recordId)

        // XP 차감 (best-effort: 레코드는 이미 삭제됨)
        try {
          if (histories.length > 0) {
            let totalXpToDeduct = 0
            for (const h of histories) totalXpToDeduct += h.xpAmount
            await xpRepo.updateUserTotalXp(userId, -totalXpToDeduct)
            await xpRepo.deleteByRecordId(recordId)
          }
        } catch {
          // CASCADE로 이미 삭제된 경우 무시
        }

        // 같은 대상의 남은 기록 수 확인
        const remaining = await recordRepo.findByUserAndTarget(userId, targetId).catch(() => [])

        return {
          sharesCount: shares.length,
          remainingCount: remaining.length,
        }
      } finally {
        setIsDeleting(false)
      }
    },
    [],
  )

  return { deleteRecord, isDeleting }
}
