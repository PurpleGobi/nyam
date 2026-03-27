// src/domain/entities/recommendation.ts
// R1: 외부 의존 0

export type RecommendationAlgorithm =
  | 'revisit' | 'scene' | 'quadrant' | 'bookmark'
  | 'authority' | 'bubble' | 'wine_pairing'

export interface RecommendationCard {
  id: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string
  photoUrl: string | null
  algorithm: RecommendationAlgorithm
  reason: string
  normalizedScore: number
  confidence: number | null
}
