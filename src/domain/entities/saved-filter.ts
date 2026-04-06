// src/domain/entities/saved-filter.ts
// R1: 외부 의존 0

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'is_null' | 'is_not_null'

export interface FilterRule {
  conjunction?: 'and' | 'or'
  attribute: string
  operator: FilterOperator
  value: string | number | boolean | null
}

export type SortOption = 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count' | 'distance'

export type BubbleSortOption = 'activity' | 'members' | 'records' | 'name'

export type FilterTargetType = 'restaurant' | 'wine'

export interface SavedFilter {
  id: string
  userId: string
  name: string
  targetType: FilterTargetType
  contextId: string | null
  rules: FilterRule[]
  sortBy: SortOption | null
  orderIndex: number
  createdAt: string
}
