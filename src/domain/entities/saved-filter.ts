// src/domain/entities/saved-filter.ts
// R1: 외부 의존 0

export interface FilterRule {
  attribute: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'is_null' | 'is_not_null'
  value: string | number | boolean | null
}

export interface SavedFilter {
  id: string
  userId: string
  name: string
  targetType: string
  contextId: string | null
  rules: FilterRule[]
  sortBy: string | null
  orderIndex: number
  createdAt: string
}
