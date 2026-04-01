// src/domain/entities/condition-chip.ts
// R1: 외부 의존 0

import type { FilterRule, FilterOperator } from '@/domain/entities/saved-filter'

/** 개별 조건 칩 — 속성:값 한 쌍 */
export interface ConditionChip {
  id: string
  attribute: string        // 'status', 'genre', 'scene', ...
  operator: FilterOperator
  value: string | number | boolean | null
  displayLabel: string     // "한식", "방문" 등 화면 표시용
  /** cascading 칩에서 실제 필터링할 DB 필드 (레벨별로 다를 때) */
  filterKey?: string
}

/** 고급 필터 칩 — 복잡한 규칙 묶음 */
export interface AdvancedFilterChip {
  id: string
  attribute: '__advanced__'
  rules: FilterRule[]
  conjunction: 'and' | 'or'
  displayLabel: string     // "Advanced Filter"
}

/** 통합 칩 타입 */
export type FilterChipItem = ConditionChip | AdvancedFilterChip

export function isAdvancedChip(chip: FilterChipItem): chip is AdvancedFilterChip {
  return chip.attribute === '__advanced__'
}

/** 칩 목록 → FilterRule[] 변환 (AND 조합) */
export function chipsToFilterRules(chips: FilterChipItem[]): FilterRule[] {
  const rules: FilterRule[] = []
  for (const chip of chips) {
    if (isAdvancedChip(chip)) {
      rules.push(...chip.rules)
    } else {
      // status:all은 필터 없음
      if (chip.attribute === 'status' && chip.value === 'all') continue
      // cascading "전체" 칩은 필터에서 제외
      if (chip.value === CASCADING_ALL) continue
      // filterKey 우선, 없으면 cascading base key, 아니면 attribute 그대로
      const attribute = chip.filterKey
        ?? (isCascadingKey(chip.attribute) ? getCascadingBaseKey(chip.attribute) : chip.attribute)
      rules.push({
        attribute,
        operator: chip.operator,
        value: chip.value,
      })
    }
  }
  return rules
}

let _chipIdCounter = 0
export function generateChipId(): string {
  _chipIdCounter += 1
  return `chip_${Date.now()}_${_chipIdCounter}`
}

/* ── cascading-select 헬퍼 ── */

/** cascading "전체" 플레이스홀더 값 */
export const CASCADING_ALL = '__all__'

/** cascading 칩 키 생성 (예: district__0, district__1) */
export function cascadingKey(baseKey: string, level: number): string {
  return `${baseKey}__${level}`
}

/** cascading 칩 키인지 판별 */
export function isCascadingKey(key: string): boolean {
  return key.includes('__') && !isNaN(Number(key.split('__')[1]))
}

/** cascading 칩 키에서 base key 추출 (district__0 → district) */
export function getCascadingBaseKey(key: string): string {
  return key.split('__')[0]
}

/** cascading 칩 키에서 레벨 추출 (district__1 → 1) */
export function getCascadingLevel(key: string): number {
  return Number(key.split('__')[1])
}
