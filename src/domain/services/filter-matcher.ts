// src/domain/services/filter-matcher.ts
// R1: 외부 의존 0
// 특수 속성(satisfaction 범위, visit_date 기간, companion_count 범위, prestige 복합) 매칭 로직

import type { FilterRule } from '@/domain/entities/saved-filter'

/** visit_date 값을 일수로 변환 */
function periodToDays(period: string): number | null {
  switch (period) {
    case '1w': return 7
    case '1m': return 30
    case '3m': return 90
    case '6m': return 180
    case '1y': return 365
    default: return null
  }
}

/** satisfaction 범위값 → [min, max) 변환 */
function satisfactionRange(value: string): [number, number] {
  switch (value) {
    case '90': return [90, 101]
    case '80': return [80, 90]
    case '70': return [70, 80]
    case '69': return [0, 70]
    default: return [0, 101]
  }
}

/** companion_count 범위값 → [min, max] 변환 */
function companionRange(value: string): [number, number] {
  switch (value) {
    case '1': return [1, 1]
    case '2': return [2, 2]
    case '3-4': return [3, 4]
    case '5+': return [5, 999]
    default: return [0, 999]
  }
}

/** complexity 범위값 → [min, max] 변환 */
function complexityRange(value: string): [number, number] {
  switch (value) {
    case 'simple': return [0, 33]
    case 'medium': return [34, 66]
    case 'complex': return [67, 100]
    default: return [0, 100]
  }
}

/**
 * 특수 속성인지 판별
 */
export function isSpecialAttribute(attr: string): boolean {
  return ['satisfaction', 'visit_date', 'companion_count', 'prestige', 'complexity'].includes(attr)
}

/**
 * 레코드의 필드 값을 추출하는 헬퍼
 * camelCase 필드명과 snake_case 속성 key를 매핑
 */
const FIELD_MAP: Record<string, string> = {
  visit_date: 'visitDate',
  companion_count: 'companionCount',
  wine_status: 'wineStatus',
  wine_type: 'wineType',
  purchase_price: 'purchasePrice',
  acidity_level: 'acidityLevel',
  sweetness_level: 'sweetnessLevel',
  meal_time: 'mealTime',
  total_price: 'totalPrice',
  price_range: 'priceRange',
  menu_type: 'menuType',
  pairing_categories: 'pairingCategories',
  aroma_labels: 'aromaLabels',
  body_level: 'bodyLevel',
}

export function getRecordField(record: Record<string, unknown>, attrKey: string): unknown {
  const field = FIELD_MAP[attrKey] ?? attrKey
  return record[field]
}

/**
 * 단일 FilterRule을 레코드에 대해 평가 (클라이언트 사이드)
 * 특수 속성은 범위/기간/복합 매칭, 일반 속성은 단순 비교
 */
export function matchRule(record: Record<string, unknown>, rule: FilterRule): boolean {
  const { attribute, operator, value } = rule

  // ── 특수 속성: satisfaction 범위 ──
  if (attribute === 'satisfaction' && (operator === 'eq' || operator === 'neq')) {
    const score = Number(record.satisfaction ?? 0)
    const [min, max] = satisfactionRange(String(value))
    const inRange = score >= min && score < max
    return operator === 'eq' ? inRange : !inRange
  }

  // ── 특수 속성: visit_date 기간 ──
  if (attribute === 'visit_date' && (operator === 'eq' || operator === 'neq')) {
    const visitDate = record.visitDate as string | null
    if (!visitDate) return operator === 'neq'
    const days = periodToDays(String(value))
    if (days === null) return true
    const diff = (Date.now() - new Date(visitDate).getTime()) / (1000 * 60 * 60 * 24)
    // '1y' = "1년+" → 365일 이상 된 기록
    const matches = String(value) === '1y' ? diff >= days : diff <= days
    return operator === 'eq' ? matches : !matches
  }

  // ── 특수 속성: companion_count 범위 ──
  if (attribute === 'companion_count' && (operator === 'eq' || operator === 'neq')) {
    const count = Number(record.companionCount ?? 0)
    const [min, max] = companionRange(String(value))
    const inRange = count >= min && count <= max
    return operator === 'eq' ? inRange : !inRange
  }

  // ── 특수 속성: complexity 범위 ──
  if (attribute === 'complexity' && (operator === 'eq' || operator === 'neq')) {
    const score = Number(record.complexity ?? 0)
    const [min, max] = complexityRange(String(value))
    const inRange = score >= min && score <= max
    return operator === 'eq' ? inRange : !inRange
  }

  // ── 특수 속성: prestige (레코드에 없는 restaurant 필드 → 스킵) ──
  if (attribute === 'prestige') {
    return true
  }

  // ── 일반 속성: 단순 비교 ──
  const val = getRecordField(record, attribute)
  switch (operator) {
    case 'eq': return String(val ?? '') === String(value)
    case 'neq': return String(val ?? '') !== String(value)
    case 'contains': return String(val ?? '').toLowerCase().includes(String(value).toLowerCase())
    case 'not_contains': return !String(val ?? '').toLowerCase().includes(String(value).toLowerCase())
    case 'gte': return Number(val) >= Number(value)
    case 'lt': return Number(val) < Number(value)
    default: return true
  }
}

/**
 * FilterRule 배열을 레코드에 대해 평가
 */
export function matchesAllRules(
  record: Record<string, unknown>,
  rules: FilterRule[],
  conjunction: 'and' | 'or',
): boolean {
  if (rules.length === 0) return true
  const results = rules.map((rule) => matchRule(record, rule))
  return conjunction === 'and' ? results.every(Boolean) : results.some(Boolean)
}
