'use client'

import { useCallback } from 'react'
import { bubbleRepo } from '@/shared/di/container'
import { evaluateShareRule, computeShareDiff } from '@/domain/services/bubble-share-sync'
import type { BubbleShareRule } from '@/domain/entities/bubble'

/**
 * 버블 자동 공유 동기화 훅
 *
 * 트리거 1: syncRecordToAllBubbles — 기록 생성/수정 후 호출
 * 트리거 2: syncAllRecordsToBubble — 공유 규칙 변경 후 호출 (소급 적용)
 */
export function useBubbleAutoSync(userId: string | null) {

  /**
   * 트리거 1: 단일 기록이 생성/수정되었을 때
   * 내 모든 active 버블 멤버십의 shareRule을 평가하여 동기화
   */
  const syncRecordToAllBubbles = useCallback(async (
    record: { id: string } & Record<string, unknown>,
  ) => {
    if (!userId) return

    const memberships = await bubbleRepo.getUserBubbles(userId)
    const activeMemberships = memberships.filter((m) => m.status === 'active' && m.shareRule)

    for (const membership of activeMemberships) {
      const shouldShare = evaluateShareRule([record], membership.shareRule)
      const currentlyShared = await bubbleRepo.getAutoSharedRecordIds(membership.bubbleId, userId)
      const recordInCurrent = currentlyShared.includes(record.id)

      if (shouldShare.length > 0 && !recordInCurrent) {
        await bubbleRepo.batchUpsertAutoShares([record.id], membership.bubbleId, userId)
      } else if (shouldShare.length === 0 && recordInCurrent) {
        await bubbleRepo.batchDeleteAutoShares([record.id], membership.bubbleId, userId)
      }
    }
  }, [userId])

  /**
   * 트리거 2: 공유 규칙이 변경되었을 때
   * 해당 버블에 대해 내 전체 기록을 재평가하여 소급 동기화
   */
  const syncAllRecordsToBubble = useCallback(async (
    bubbleId: string,
    shareRule: BubbleShareRule | null,
    allRecords: Array<{ id: string } & Record<string, unknown>>,
  ) => {
    if (!userId) return

    // 1. 규칙 저장
    await bubbleRepo.updateShareRule(bubbleId, userId, shareRule)

    // 2. 새 규칙으로 전체 기록 평가
    const shouldShareIds = evaluateShareRule(allRecords, shareRule)

    // 3. 현재 자동 공유 상태와 비교
    const currentlySharedIds = await bubbleRepo.getAutoSharedRecordIds(bubbleId, userId)
    const { toAdd, toRemove } = computeShareDiff(shouldShareIds, currentlySharedIds)

    // 4. 일괄 동기화
    await Promise.all([
      bubbleRepo.batchUpsertAutoShares(toAdd, bubbleId, userId),
      bubbleRepo.batchDeleteAutoShares(toRemove, bubbleId, userId),
    ])
  }, [userId])

  return { syncRecordToAllBubbles, syncAllRecordsToBubble }
}
