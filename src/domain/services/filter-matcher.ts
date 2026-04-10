// src/domain/services/filter-matcher.ts
// R1: 외부 의존 0
// 특수 속성(satisfaction 범위, visit_date 기간, companion_count 범위, prestige 복합) 매칭 로직
// satisfaction = (axisX + axisY) / 2 로 산출된 종합 만족도 (1-100)

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

/** satisfaction 범위값 -> [min, max) 변환 */
function satisfactionRange(value: string): [number, number] {
  switch (value) {
    case '90': return [90, 101]
    case '80': return [80, 90]
    case '70': return [70, 80]
    case '69': return [0, 70]
    default: return [0, 101]
  }
}

/** companion_count 범위값 -> [min, max] 변환 */
function companionRange(value: string): [number, number] {
  switch (value) {
    case '1': return [1, 1]
    case '2': return [2, 2]
    case '3-4': return [3, 4]
    case '5+': return [5, 999]
    default: return [0, 999]
  }
}

/** complexity 범위값 -> [min, max] 변환 */
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
 * records 테이블이 flat 구조이므로 직접 접근
 */
const FIELD_MAP: Record<string, string> = {
  visit_date: 'visitDate',
  companion_count: 'companionCount',
  wine_type: 'wineType',
  purchase_price: 'purchasePrice',
  acidity_level: 'acidityLevel',
  sweetness_level: 'sweetnessLevel',
  meal_time: 'mealTime',
  total_price: 'totalPrice',
  price_range: 'priceRange',
  menu_type: 'menuType',
  pairing_categories: 'pairingCategories',
  aroma_labels: 'aromaPrimary',
  body_level: 'bodyLevel',
  country: 'country',
  city: 'city',
  district: 'district',
}

export function getRecordField(record: Record<string, unknown>, attrKey: string): unknown {
  // satisfaction은 record에 직접 존재
  if (attrKey === 'satisfaction') return record['satisfaction']

  const field = FIELD_MAP[attrKey] ?? attrKey
  return record[field]
}

/** prestige 복합 조건 매칭 — prestige 배열 기반 (type + grade 지원) */
function matchPrestige(record: Record<string, unknown>, value: string): boolean {
  const rp = (record.prestige ?? []) as Array<{ type: string; grade?: string }>

  // grade 레벨 매칭: 'michelin:3_star', 'blue_ribbon:2_ribbon' 등
  if (value.includes(':')) {
    const [type, grade] = value.split(':')
    return rp.some(p => p.type === type && p.grade === grade)
  }

  // type 레벨 매칭: 'michelin', 'blue_ribbon', 'tv', 'none'
  switch (value) {
    case 'michelin':
      return rp.some(p => p.type === 'michelin')
    case 'blue_ribbon':
      return rp.some(p => p.type === 'blue_ribbon')
    case 'tv':
      return rp.some(p => p.type === 'tv')
    case 'none':
      return rp.length === 0
    default:
      return true
  }
}

/**
 * 단일 FilterRule을 레코드에 대해 평가 (클라이언트 사이드)
 * 특수 속성은 범위/기간/복합 매칭, 일반 속성은 단순 비교
 */
export function matchRule(record: Record<string, unknown>, rule: FilterRule): boolean {
  const { attribute, operator, value } = rule

  // -- 특수 속성: satisfaction 범위 --
  if (attribute === 'satisfaction' && (operator === 'eq' || operator === 'neq')) {
    const score = Number(record.satisfaction ?? 0)
    const [min, max] = satisfactionRange(String(value))
    const inRange = score >= min && score < max
    return operator === 'eq' ? inRange : !inRange
  }

  // -- 특수 속성: visit_date 기간 --
  // [FIX #2] HomeTarget은 latestVisitDate, RecordWithTarget은 visitDate
  if (attribute === 'visit_date' && (operator === 'eq' || operator === 'neq')) {
    const visitDate = (record.latestVisitDate ?? record.visitDate) as string | null
    if (!visitDate) return operator === 'neq'
    const days = periodToDays(String(value))
    if (days === null) return true
    const diff = (Date.now() - new Date(visitDate).getTime()) / (1000 * 60 * 60 * 24)
    const matches = String(value) === '1y' ? diff >= days : diff <= days
    return operator === 'eq' ? matches : !matches
  }

  // -- 특수 속성: companion_count 범위 --
  // [FIX #7] sources 존재 = HomeTarget -> records[0]에서 추출
  if (attribute === 'companion_count' && (operator === 'eq' || operator === 'neq')) {
    const sources = record.sources as string[] | undefined
    let count: number
    if (sources) {
      // HomeTarget: records 배열에서 최신 기록의 companionCount
      const records = record.records as Array<{ companionCount: number | null }> | undefined
      count = records?.[0]?.companionCount ?? 0
    } else {
      // RecordWithTarget: 직접 필드
      count = Number(record.companionCount ?? 0)
    }
    const [min, max] = companionRange(String(value))
    const inRange = count >= min && count <= max
    return operator === 'eq' ? inRange : !inRange
  }

  // -- 특수 속성: complexity 범위 --
  if (attribute === 'complexity' && (operator === 'eq' || operator === 'neq')) {
    const score = Number(record.complexity ?? 0)
    const [min, max] = complexityRange(String(value))
    const inRange = score >= min && score <= max
    return operator === 'eq' ? inRange : !inRange
  }

  // -- 특수 속성: prestige (미슐랭/블루리본/TV/없음) --
  if (attribute === 'prestige' && (operator === 'eq' || operator === 'neq')) {
    const matches = matchPrestige(record, String(value))
    return operator === 'eq' ? matches : !matches
  }

  // -- 특수 속성: prestige grade sub-chip (prestige_grade:michelin 등) --
  if (attribute.startsWith('prestige_grade:') && (operator === 'eq' || operator === 'neq')) {
    const type = attribute.slice('prestige_grade:'.length)
    const rp = (record.prestige ?? []) as Array<{ type: string; grade?: string }>
    const matches = rp.some(p => p.type === type && p.grade === String(value))
    return operator === 'eq' ? matches : !matches
  }

  // -- view 필터 매칭 --
  // [FIX #7] sources 배열(HomeTarget) / source 필드(RecordWithTarget) 하위 호환
  if (attribute === 'view') {
    const viewValue = String(value)
    const sources = record.sources as string[] | undefined

    if (viewValue === 'visited' || viewValue === 'tasted') {
      const matches = sources ? sources.includes('mine') : record.source === 'mine'
      return operator === 'eq' ? matches : !matches
    }
    if (viewValue === 'bookmark') {
      const matches = sources ? sources.includes('bookmark') : record.source === 'bookmark'
      return operator === 'eq' ? matches : !matches
    }
    if (viewValue === 'cellar') {
      // HomeTarget: isCellar 직접 확인, RecordWithTarget: 서버에서 이미 필터링
      if (sources) {
        const matches = record.isCellar === true
        return operator === 'eq' ? matches : !matches
      }
      return true
    }
    if (viewValue === 'unrated') {
      if (sources) {
        // HomeTarget: axisX가 null인지 확인
        const matches = record.axisX == null
        return operator === 'eq' ? matches : !matches
      }
      const axisX = record.axisX ?? record['axis_x']
      const matches = axisX == null
      return operator === 'eq' ? matches : !matches
    }
    // bubble / public / following -> 서버 쿼리로 처리됨
    if (viewValue === 'bubble' || viewValue === 'public' || viewValue === 'following') {
      if (sources) {
        const matches = sources.includes(viewValue)
        return operator === 'eq' ? matches : !matches
      }
      return true
    }
  }

  // -- 배열 속성: area (생활권, TEXT[]) --
  if (attribute === 'area') {
    const arr = record['area'] as string[] | null | undefined
    if (!arr || !Array.isArray(arr)) return operator === 'neq'
    const matches = arr.includes(String(value))
    return operator === 'eq' ? matches : !matches
  }

  // -- 일반 속성: 단순 비교 --
  const val = getRecordField(record, attribute)
  switch (operator) {
    case 'eq': return String(val ?? '') === String(value)
    case 'neq': return String(val ?? '') !== String(value)
    case 'contains': return String(val ?? '').toLowerCase().includes(String(value).toLowerCase())
    case 'not_contains': return !String(val ?? '').toLowerCase().includes(String(value).toLowerCase())
    case 'gte': return Number(val) >= Number(value)
    case 'lte': return Number(val) <= Number(value)
    case 'lt': return Number(val) < Number(value)
    default: return true
  }
}

/**
 * FilterRule 배열을 레코드에 대해 평가
 * rule-level conjunction이 있으면 attribute별 그룹핑 + 그룹 내 OR / 그룹 간 AND
 */
export function matchesAllRules(
  record: Record<string, unknown>,
  rules: FilterRule[],
  conjunction: 'and' | 'or',
): boolean {
  if (rules.length === 0) return true

  // rule-level conjunction이 있으면 attribute별 그룹핑
  const hasRuleLevelConjunction = rules.some((r) => r.conjunction === 'or')

  if (hasRuleLevelConjunction) {
    // attribute별로 그룹핑
    const groups = new Map<string, FilterRule[]>()
    for (const rule of rules) {
      const key = rule.attribute
      const existing = groups.get(key) ?? []
      existing.push(rule)
      groups.set(key, existing)
    }
    // 각 그룹: 내부에 or가 있으면 OR, 아니면 AND. 그룹 간은 AND.
    for (const [, groupRules] of groups) {
      const isOrGroup = groupRules.some((r) => r.conjunction === 'or')
      const groupResults = groupRules.map((r) => matchRule(record, r))
      const groupPass = isOrGroup ? groupResults.some(Boolean) : groupResults.every(Boolean)
      if (!groupPass) return false
    }
    return true
  }

  // 기존 로직: 전체 conjunction 적용
  const results = rules.map((rule) => matchRule(record, rule))
  return conjunction === 'and' ? results.every(Boolean) : results.some(Boolean)
}
