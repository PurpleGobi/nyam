// src/domain/services/filter-query-builder.ts
// R1: 외부 의존 0

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

/**
 * 단일 FilterRule을 PostgREST 필터 문자열로 변환
 * 예: { attribute: 'name', operator: 'contains', value: '스시' }
 *   → 'name=ilike.*스시*'
 */
function ruleToFilter(rule: FilterRule): string {
  const { attribute, operator, value } = rule

  if (operator === 'is_null') {
    return `${attribute}=is.null`
  }

  if (operator === 'is_not_null') {
    return `${attribute}=not.is.null`
  }

  const postgrestOp = operatorToPostgrest(operator)

  if (operator === 'contains') {
    return `${attribute}=${postgrestOp}.*${String(value)}*`
  }

  if (operator === 'not_contains') {
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

  const filters = rules.map(ruleToFilter)

  if (filters.length === 1) {
    return filters[0]
  }

  return `${conjunction}=(${filters.join(',')})`
}
