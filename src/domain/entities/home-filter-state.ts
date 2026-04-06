// src/domain/entities/home-filter-state.ts
// R1: 외부 의존 0

import type { FilterChipItem } from '@/domain/entities/condition-chip'
import type { HomeTab } from '@/domain/entities/home-state'

export interface TabFilterState {
  chips: FilterChipItem[]
  updatedAt: string  // ISO 8601
}

export type HomeFilterState = Partial<Record<HomeTab, TabFilterState>>
