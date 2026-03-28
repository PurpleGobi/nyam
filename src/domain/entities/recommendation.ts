// src/domain/entities/recommendation.ts
// R1: 외부 의존 0

export type RecommendationAlgorithm =
  | 'revisit' | 'scene' | 'quadrant' | 'bookmark'
  | 'authority' | 'bubble' | 'wine_pairing'

export type RecommendationSource = 'ai' | 'bubble' | 'web'

/** DB 테이블(ai_recommendations) 매핑 엔티티 */
export interface AIRecommendation {
  id: string
  userId: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  reason: string
  algorithm: RecommendationAlgorithm
  confidence: number
  isDismissed: boolean
  createdAt: string
  expiresAt: string | null
}

/** UI 표시용 추천 카드 */
export interface RecommendationCard {
  id: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string
  photoUrl: string | null
  algorithm: RecommendationAlgorithm
  source: RecommendationSource
  reason: string
  normalizedScore: number
  confidence: number | null
}
