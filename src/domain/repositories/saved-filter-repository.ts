// src/domain/repositories/saved-filter-repository.ts
// R1: 외부 의존 0

import type { SavedFilter, FilterRule } from '@/domain/entities/saved-filter'

export interface SavedFilterRepository {
  getByUser(userId: string, targetType: string): Promise<SavedFilter[]>
  create(params: { userId: string; name: string; targetType: string; rules: FilterRule[]; sortBy?: string }): Promise<SavedFilter>
  delete(filterId: string): Promise<void>
  getRecordCount(userId: string, targetType: string, rules: FilterRule[]): Promise<number>
  reorder(ids: string[]): Promise<void>
}
