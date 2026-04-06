// src/domain/repositories/filter-state-repository.ts
// R1: 외부 의존 0

import type { HomeFilterState } from '@/domain/entities/home-filter-state'

export interface FilterStateRepository {
  load(userId: string): Promise<HomeFilterState>
  save(userId: string, state: HomeFilterState): Promise<void>
}
