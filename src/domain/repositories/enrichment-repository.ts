// src/domain/repositories/enrichment-repository.ts
// R1: 외부 의존 0

import type { RestaurantEnrichment } from '@/domain/entities/restaurant-enrichment'

export interface EnrichmentRepository {
  /**
   * 식당의 enrichment 캐시 조회.
   * 없으면 null.
   */
  findByRestaurantId(restaurantId: string): Promise<RestaurantEnrichment | null>

  /**
   * 서버(Edge Function)에 enrichment 생성을 비동기 트리거.
   * 이미 processing 상태면 no-op.
   * fire-and-forget 의미 — 완료 대기 없음.
   */
  triggerEnrichment(restaurantId: string): Promise<void>
}
