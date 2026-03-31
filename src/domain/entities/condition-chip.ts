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
      rules.push({
        attribute: chip.attribute,
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
