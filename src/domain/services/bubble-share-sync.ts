// src/domain/services/bubble-share-sync.ts
// R1: 외부 의존 0 (domain 내부만 import)
// 버블 자동 공유 규칙 평가 — filter-matcher 재사용

import type { BubbleShareRule } from '@/domain/entities/bubble'
import type { FilterRule } from '@/domain/entities/saved-filter'
import { matchesAllRules } from '@/domain/services/filter-matcher'

/**
 * 레코드의 targetType에 해당하는 domain 규칙만 추출
 * domain 없는 레거시 규칙은 모든 레코드에 적용 (하위 호환)
 */
function getRulesForRecord(
  allRules: BubbleShareRule['rules'],
  recordTargetType: string | undefined,
): FilterRule[] {
  const domainedRules = allRules.filter((r) => r.domain != null)
  const genericRules = allRules.filter((r) => r.domain == null) as FilterRule[]

  if (domainedRules.length === 0) return genericRules

  const myDomainRules = domainedRules.filter((r) => r.domain === recordTargetType) as FilterRule[]
  return [...myDomainRules, ...genericRules]
}

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

  // mode === 'filtered' — 도메인별 규칙 분리 적용
  return records
    .filter((record) => {
      const targetType = record.targetType as string | undefined
      const relevantRules = getRulesForRecord(shareRule.rules, targetType)
      if (relevantRules.length === 0) return true  // 해당 도메인 규칙 없음 → 제한 없음
      return matchesAllRules(record, relevantRules, shareRule.conjunction)
    })
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
  const targetType = record.targetType as string | undefined
  const relevantRules = getRulesForRecord(shareRule.rules, targetType)
  if (relevantRules.length === 0) return true  // 해당 도메인 규칙 없음 → 제한 없음
  return matchesAllRules(record, relevantRules, shareRule.conjunction)
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
