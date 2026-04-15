'use client'

import { useCallback } from 'react'
import { bubbleRepo } from '@/shared/di/container'
import { evaluateShareRule, computeShareDiff } from '@/domain/services/bubble-share-sync'
import type { BubbleShareRule } from '@/domain/entities/bubble'

export interface SyncResult {
  sharedTo: Array<{ bubbleId: string; bubbleName: string }>
  unsharedFrom: Array<{ bubbleId: string; bubbleName: string }>
}

/**
 * 버블 자동 공유 동기화 훅 (bubble_items 기반)
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
    record: { id: string; targetId: string; targetType: 'restaurant' | 'wine' } & Record<string, unknown>,
  ): Promise<SyncResult> => {
    const result: SyncResult = { sharedTo: [], unsharedFrom: [] }
    if (!userId) return result

    const memberships = await bubbleRepo.getUserBubbles(userId)
    const activeMemberships = memberships.filter((m) => m.status === 'active' && m.shareRule)

    for (const membership of activeMemberships) {
      const shouldShare = evaluateShareRule([record], membership.shareRule)
      const info = { bubbleId: membership.bubbleId, bubbleName: membership.bubbleName ?? '' }

      if (shouldShare.length > 0) {
        await bubbleRepo.batchUpsertAutoItems(
          [{ targetId: record.targetId, targetType: record.targetType }],
          membership.bubbleId,
        )
        result.sharedTo.push(info)
      } else {
        result.unsharedFrom.push(info)
      }
    }

    return result
  }, [userId])

  /**
   * 트리거 2: 공유 규칙이 변경되었을 때
   * 해당 버블에 대해 내 전체 기록을 재평가하여 소급 동기화
   */
  const syncAllRecordsToBubble = useCallback(async (
    bubbleId: string,
    shareRule: BubbleShareRule | null,
    allRecords: Array<{ id: string; targetId: string; targetType: 'restaurant' | 'wine' } & Record<string, unknown>>,
  ) => {
    if (!userId) return

    // 1. 규칙 저장
    await bubbleRepo.updateShareRule(bubbleId, userId, shareRule)

    // 2. 새 규칙으로 전체 기록 평가 → target 기반 diff
    const shouldShareIds = evaluateShareRule(allRecords, shareRule)
    const currentAutoTargetIds = await bubbleRepo.getAutoItemTargetIds(bubbleId)
    const shouldShareTargetIds = allRecords
      .filter((r) => shouldShareIds.includes(r.id))
      .map((r) => r.targetId)
    const { toAdd, toRemove } = computeShareDiff(shouldShareTargetIds, currentAutoTargetIds)

    // 3. 일괄 동기화 — bubble_items
    const toAddSet = new Set(toAdd)
    const toAddTargets = allRecords
      .filter((r) => toAddSet.has(r.targetId))
      .map((r) => ({ targetId: r.targetId, targetType: r.targetType }))

    await Promise.all([
      toAddTargets.length > 0 ? bubbleRepo.batchUpsertAutoItems(toAddTargets, bubbleId) : Promise.resolve(),
      toRemove.length > 0 ? bubbleRepo.batchDeleteAutoItems(toRemove, 'restaurant', bubbleId) : Promise.resolve(),
    ])
  }, [userId])

  return { syncRecordToAllBubbles, syncAllRecordsToBubble }
}
