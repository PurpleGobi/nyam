// src/domain/services/filter-query-builder.ts
// R1: 외부 의존 0
// 특수 속성(satisfaction, visit_date, companion_count, prestige, complexity) → PostgREST 변환
// satisfaction = (axisX + axisY) / 2 로 산출된 종합 만족도 (1-100)

import type { FilterRule } from '@/domain/entities/saved-filter'

/**
 * 연산자를 PostgREST 필터 접두사로 매핑
 */
function operatorToPostgrest(operator: FilterRule['operator']): string {
  const map: Record<FilterRule['operator'], string> = {
    eq: 'eq',
    neq: 'neq',
    gt: 'gt',
    gte: 'gte',
    lt: 'lt',
    lte: 'lte',
    contains: 'ilike',
    not_contains: 'not.ilike',
    is_null: 'is',
    is_not_null: 'not.is',
  }
  return map[operator]
}

// ─── 특수 속성 → PostgREST 필터 변환 ───

function satisfactionFilter(value: string, negate: boolean): string {
  const ranges: Record<string, [number, number]> = {
    '90': [90, 101],
    '80': [80, 90],
    '70': [70, 80],
    '69': [0, 70],
  }
  const [min, max] = ranges[value] ?? [0, 101]
  const cond = `and=(satisfaction=gte.${min},satisfaction=lt.${max})`
  return negate ? `not.${cond}` : cond
}

function visitDateFilter(value: string, negate: boolean): string {
  const daysMap: Record<string, number> = {
    '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365,
  }
  const days = daysMap[value]
  if (!days) return ''
  // '1y' = "1년+" → 365일 이상 전
  if (value === '1y') {
    const cond = `visit_date=lt.now()-interval'${days}d'`
    return negate ? `not.(${cond})` : cond
  }
  const cond = `visit_date=gte.now()-interval'${days}d'`
  return negate ? `not.(${cond})` : cond
}

function companionCountFilter(value: string, negate: boolean): string {
  const ranges: Record<string, [number, number]> = {
    '1': [1, 1],
    '2': [2, 2],
    '3-4': [3, 4],
    '5+': [5, 999],
  }
  const [min, max] = ranges[value] ?? [0, 999]
  const cond = min === max
    ? `companion_count=eq.${min}`
    : `and=(companion_count=gte.${min},companion_count=lte.${max})`
  return negate ? `not.(${cond})` : cond
}

function complexityFilter(value: string, negate: boolean): string {
  const ranges: Record<string, [number, number]> = {
    simple: [0, 33],
    medium: [34, 66],
    complex: [67, 100],
  }
  const [min, max] = ranges[value] ?? [0, 100]
  const cond = `and=(complexity=gte.${min},complexity=lte.${max})`
  return negate ? `not.${cond}` : cond
}

function prestigeFilter(value: string, negate: boolean): string {
  // JSONB 배열에서 type 필드로 필터링 — PostgREST cs (contains) 연산자 사용
  // GIN 인덱스(idx_restaurants_prestige)가 있으므로 성능 OK
  const conditions: Record<string, string> = {
    michelin_1: 'prestige=cs.[{"type":"michelin"}]',
    blue_ribbon: 'prestige=cs.[{"type":"blue_ribbon"}]',
    tv: 'prestige=cs.[{"type":"tv"}]',
    none: 'prestige=eq.[]',
  }
  const cond = conditions[value]
  if (!cond) return ''
  return negate ? `not.(${cond})` : cond
}

/**
 * 단일 FilterRule을 PostgREST 필터 문자열로 변환
 */
function ruleToFilter(rule: FilterRule): string {
  const { attribute, operator, value } = rule
  const negate = operator === 'neq'

  // 특수 속성 처리
  if (attribute === 'satisfaction' && (operator === 'eq' || operator === 'neq')) {
    return satisfactionFilter(String(value), negate)
  }
  if (attribute === 'visit_date' && (operator === 'eq' || operator === 'neq')) {
    return visitDateFilter(String(value), negate)
  }
  if (attribute === 'companion_count' && (operator === 'eq' || operator === 'neq')) {
    return companionCountFilter(String(value), negate)
  }
  if (attribute === 'complexity' && (operator === 'eq' || operator === 'neq')) {
    return complexityFilter(String(value), negate)
  }
  if (attribute === 'prestige') {
    return prestigeFilter(String(value), negate)
  }

  // 일반 속성 처리
  if (operator === 'is_null') {
    return `${attribute}=is.null`
  }
  if (operator === 'is_not_null') {
    return `${attribute}=not.is.null`
  }

  const postgrestOp = operatorToPostgrest(operator)

  if (operator === 'contains' || operator === 'not_contains') {
    return `${attribute}=${postgrestOp}.*${String(value)}*`
  }

  return `${attribute}=${postgrestOp}.${String(value)}`
}

/**
 * FilterRule 배열을 PostgREST 필터 쿼리 문자열로 변환
 *
 * conjunction 'and' → 'and=(filter1,filter2,...)'
 * conjunction 'or'  → 'or=(filter1,filter2,...)'
 *
 * 규칙이 1개면 conjunction 래핑 없이 단일 필터 반환
 * 규칙이 0개면 빈 문자열 반환
 */
export function buildFilterQuery(rules: FilterRule[], conjunction: 'and' | 'or'): string {
  if (rules.length === 0) {
    return ''
  }

  const filters = rules.map(ruleToFilter).filter(Boolean)

  if (filters.length === 0) {
    return ''
  }

  if (filters.length === 1) {
    return filters[0]
  }

  return `${conjunction}=(${filters.join(',')})`
}
