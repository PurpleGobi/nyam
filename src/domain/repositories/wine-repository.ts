// src/domain/repositories/wine-repository.ts
// R1: 외부 의존 0

import type { WineSearchResult } from '@/domain/entities/search'

export interface WineRepository {
  search(query: string, userId: string): Promise<WineSearchResult[]>
  create(input: CreateWineInput): Promise<{ id: string; name: string; isExisting: boolean }>
}

export interface CreateWineInput {
  name: string
  wineType: string
  producer?: string
  vintage?: number
  region?: string
  country?: string
  variety?: string
}
