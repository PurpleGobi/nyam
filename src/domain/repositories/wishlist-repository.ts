// src/domain/repositories/wishlist-repository.ts
// R1: 외부 의존 0

export interface WishlistRepository {
  isWishlisted(userId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<boolean>
  add(userId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<void>
  remove(userId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<void>
}
