// src/domain/entities/wishlist.ts
// R1: 외부 의존 0

export type WishlistSource = 'direct' | 'bubble' | 'ai' | 'web'

export interface Wishlist {
  id: string
  userId: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  source: WishlistSource
  sourceRecordId: string | null
  isVisited: boolean
  createdAt: string
}
