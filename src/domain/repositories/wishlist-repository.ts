// src/domain/repositories/wishlist-repository.ts
// R1: 외부 의존 0

import type { Wishlist, WishlistSource } from '@/domain/entities/wishlist'

export interface WishlistRepository {
  /** 특정 대상의 찜 여부 확인 */
  isWishlisted(userId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<boolean>

  /** 찜 추가 (UNIQUE 제약: 이미 존재하면 무시) */
  add(params: {
    userId: string
    targetId: string
    targetType: 'restaurant' | 'wine'
    source: WishlistSource
    sourceRecordId?: string
  }): Promise<Wishlist>

  /** 찜 해제 */
  remove(userId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<void>

  /** 내 찜 목록 조회 (target_type별, created_at DESC) */
  findByUser(userId: string, targetType: 'restaurant' | 'wine'): Promise<Wishlist[]>

  /** is_visited 업데이트 (기록 생성/삭제 시 호출) */
  updateVisitStatus(
    userId: string,
    targetId: string,
    targetType: 'restaurant' | 'wine',
    isVisited: boolean,
  ): Promise<void>
}
