// src/domain/services/bubble-share-sync.ts
// R1: 외부 의존 0 (domain 내부만 import)
// 버블 자동 공유 규칙 평가 — filter-matcher 재사용

import type { BubbleShareRule } from '@/domain/entities/bubble'
import type { FilterRule } from '@/domain/entities/saved-filter'
import { matchesAllRules } from '@/domain/services/filter-matcher'

/**
 * 공유 규칙에 따라 공유해야 할 recordId 목록을 반환
 */
export function evaluateShareRule(
  records: Array<{ id: string } & Record<string, unknown>>,
  shareRule: BubbleShareRule | null,
): string[] {
  if (!shareRule) return []

  if (shareRule.mode === 'all') {
    return records.map((r) => r.id)
  }

  // mode === 'filtered'
  const filterRules = shareRule.rules as FilterRule[]
  return records
    .filter((record) => matchesAllRules(record, filterRules, shareRule.conjunction))
    .map((r) => r.id)
}

/**
 * 단일 기록이 공유 규칙에 매칭되는지 평가
 */
export function matchesShareRule(
  record: Record<string, unknown>,
  shareRule: BubbleShareRule | null,
): boolean {
  if (!shareRule) return false
  if (shareRule.mode === 'all') return true
  return matchesAllRules(record, shareRule.rules as FilterRule[], shareRule.conjunction)
}

/**
 * 현재 공유 상태와 비교하여 추가/삭제할 diff 계산
 */
export function computeShareDiff(
  shouldShareIds: string[],
  currentlySharedIds: string[],
): { toAdd: string[]; toRemove: string[] } {
  const shouldSet = new Set(shouldShareIds)
  const currentSet = new Set(currentlySharedIds)

  const toAdd = shouldShareIds.filter((id) => !currentSet.has(id))
  const toRemove = currentlySharedIds.filter((id) => !shouldSet.has(id))

  return { toAdd, toRemove }
}
