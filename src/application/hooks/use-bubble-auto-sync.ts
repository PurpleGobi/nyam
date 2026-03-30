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
 * 버블 자동 공유 동기화 훅
 *
 * 트리거 1: syncRecordToAllBubbles — 기록 생성/수정 후 호출
 * 트리거 2: syncAllRecordsToBubble — 공유 규칙 변경 후 호출 (소급 적용)
 */
export function useBubbleAutoSync(userId: string | null) {

  /**
   * 트리거 1: 단일 기록이 생성/수정되었을 때
   * 내 모든 active 버블 멤버십의 shareRule을 평가하여 동기화
   * @returns 공유/해제된 버블 목록 (토스트용)
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
      const currentlyShared = await bubbleRepo.getAutoSharedRecordIds(membership.bubbleId, userId)
      const recordInCurrent = currentlyShared.includes(record.id)
      const info = { bubbleId: membership.bubbleId, bubbleName: membership.bubbleName ?? '' }

      if (shouldShare.length > 0 && !recordInCurrent) {
        await bubbleRepo.batchUpsertAutoShares([{ id: record.id, targetId: record.targetId, targetType: record.targetType }], membership.bubbleId, userId)
        result.sharedTo.push(info)
      } else if (shouldShare.length === 0 && recordInCurrent) {
        await bubbleRepo.batchDeleteAutoShares([record.id], membership.bubbleId, userId)
        result.unsharedFrom.push(info)
      } else if (shouldShare.length > 0 && recordInCurrent) {
        // 이미 공유 중 — 토스트에는 포함
        result.sharedTo.push(info)
      }
    }

    return result
  }, [userId])

  /**
   * 트리거 2: 공유 규칙이 변경되었을 때
   * 해당 버블에 대해 내 전체 기록을 재평가하여 소급 동기화 (auto_synced=true만)
   */
  const syncAllRecordsToBubble = useCallback(async (
    bubbleId: string,
    shareRule: BubbleShareRule | null,
    allRecords: Array<{ id: string; targetId: string; targetType: 'restaurant' | 'wine' } & Record<string, unknown>>,
  ) => {
    if (!userId) return

    // 1. 규칙 저장
    await bubbleRepo.updateShareRule(bubbleId, userId, shareRule)

    // 2. 새 규칙으로 전체 기록 평가
    const shouldShareIds = evaluateShareRule(allRecords, shareRule)

    // 3. 현재 자동 공유 상태와 비교 (auto_synced=true만)
    const currentlySharedIds = await bubbleRepo.getAutoSharedRecordIds(bubbleId, userId)
    const { toAdd, toRemove } = computeShareDiff(shouldShareIds, currentlySharedIds)

    // 4. 일괄 동기화 — toAdd IDs를 record 객체로 매칭
    const toAddSet = new Set(toAdd)
    const toAddRecords = allRecords
      .filter((r) => toAddSet.has(r.id))
      .map((r) => ({ id: r.id, targetId: r.targetId, targetType: r.targetType }))
    await Promise.all([
      bubbleRepo.batchUpsertAutoShares(toAddRecords, bubbleId, userId),
      bubbleRepo.batchDeleteAutoShares(toRemove, bubbleId, userId),
    ])
  }, [userId])

  return { syncRecordToAllBubbles, syncAllRecordsToBubble }
}
