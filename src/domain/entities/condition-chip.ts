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
  /** true면 칩 바에 표시하지 않음 (내부 상태 보관용) */
  hidden?: boolean
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
      // status:all 은 필터 없음
      if (chip.attribute === 'status' && String(chip.value) === 'all') continue
      // location:nearby는 후속 GPS 구현까지 스킵
      if (chip.attribute === 'location' && String(chip.value) === 'nearby') continue
      // cascading "전체" 칩은 필터에서 제외
      if (chip.value === CASCADING_ALL) continue
      // location 칩 그룹: tab 칩은 스킵, city/detail은 filterKey로 처리
      if (chip.attribute === LOCATION_TAB_KEY) continue
      if (chip.attribute === LOCATION_CITY_KEY) {
        rules.push({ attribute: 'city', operator: chip.operator, value: chip.value })
        continue
      }
      if (chip.attribute === LOCATION_DETAIL_KEY) {
        const detailAttr = chip.filterKey ?? 'district'
        rules.push({ attribute: detailAttr, operator: chip.operator, value: chip.value })
        continue
      }
      // prestige 칩 그룹: type칩은 OR로, grade칩은 그대로 전달
      if (chip.attribute === PRESTIGE_TYPE_KEY) {
        rules.push({ conjunction: 'or', attribute: 'prestige', operator: chip.operator, value: chip.value })
        continue
      }
      if (chip.attribute.startsWith(PRESTIGE_GRADE_PREFIX)) {
        rules.push({ attribute: chip.attribute, operator: chip.operator, value: chip.value })
        continue
      }

      // filterKey 우선, 없으면 cascading base key, 아니면 attribute 그대로
      const attribute = chip.filterKey
        ?? (isCascadingKey(chip.attribute) ? getCascadingBaseKey(chip.attribute) : chip.attribute)

      // multi-select: 쉼표 value → 복수 OR rules
      if (String(chip.value).includes(',')) {
        const values = String(chip.value).split(',')
        for (const v of values) {
          rules.push({
            conjunction: 'or',
            attribute,
            operator: chip.operator,
            value: v.trim(),
          })
        }
      } else {
        rules.push({
          attribute,
          operator: chip.operator,
          value: chip.value,
        })
      }
    }
  }
  return rules
}

let _chipIdCounter = 0
export function generateChipId(): string {
  _chipIdCounter += 1
  return `chip_${Date.now()}_${_chipIdCounter}`
}

/** 식당/와인 탭 디폴트 '보기: 내기록' 칩 */
export function createDefaultViewChip(): ConditionChip {
  return {
    id: generateChipId(),
    attribute: 'view',
    operator: 'eq',
    value: 'mine',
    displayLabel: '내 기록',
  }
}

/** '보기: 버블' 칩 (URL ?bubbleId= 진입 시 사용) */
export function createBubbleViewChip(): ConditionChip {
  return {
    id: generateChipId(),
    attribute: 'view',
    operator: 'eq',
    value: 'bubble',
    displayLabel: '버블',
  }
}

/* ── cascading-select 헬퍼 ── */

/** cascading "전체" 플레이스홀더 값 */
export const CASCADING_ALL = '__all__'

/* ── location 칩 키 상수 ── */
export const LOCATION_TAB_KEY = 'location__tab'
export const LOCATION_CITY_KEY = 'location__city'
export const LOCATION_DETAIL_KEY = 'location__detail'

/** location 칩 키인지 판별 */
export function isLocationChipKey(key: string): boolean {
  return key === LOCATION_TAB_KEY || key === LOCATION_CITY_KEY || key === LOCATION_DETAIL_KEY
}

/* ── prestige 칩 키 상수 ── */
export const PRESTIGE_TYPE_KEY = 'prestige_type'
export const PRESTIGE_GRADE_PREFIX = 'prestige_grade:'

/** prestige 칩 키인지 판별 */
export function isPrestigeChipKey(key: string): boolean {
  return key === PRESTIGE_TYPE_KEY || key.startsWith(PRESTIGE_GRADE_PREFIX)
}

/** prestige grade 칩에서 type 추출 (prestige_grade:michelin → michelin) */
export function getPrestigeGradeType(key: string): string {
  return key.slice(PRESTIGE_GRADE_PREFIX.length)
}

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
