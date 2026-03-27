// src/domain/repositories/discover-repository.ts
// R1: domain 인터페이스 — 외부 의존 0

import type { DiscoverCard } from '@/domain/entities/discover'

/**
 * Discover Repository 인터페이스
 * infrastructure/repositories/supabase-discover-repository.ts에서 구현
 */
export interface DiscoverRepository {
  /** 지역별 Discover 카드 목록 조회 (페이지네이션) */
  getByArea(area: string, page: number, limit: number): Promise<DiscoverCard[]>
}
