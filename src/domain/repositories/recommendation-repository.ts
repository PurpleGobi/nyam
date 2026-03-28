// src/domain/repositories/recommendation-repository.ts
// R1: domain 인터페이스 — 외부 의존 0

import type { RecommendationCard } from '@/domain/entities/recommendation'

export interface RevisitCandidate {
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string
  photoUrl: string | null
  avgSatisfaction: number
  daysSinceLastVisit: number
  visitCount: number
}

export interface AuthorityCandidate {
  targetId: string
  name: string
  meta: string
  photoUrl: string | null
  naverRating: number | null
  kakaoRating: number | null
  googleRating: number | null
  michelinStars: number | null
  hasBlueRibbon: boolean
}

export interface BubbleCandidate {
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string
  photoUrl: string | null
  bubbleName: string
  avgSatisfaction: number
  isPrivateBubble: boolean
}

export interface SceneCandidate {
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string
  photoUrl: string | null
  avgSatisfaction: number
  scene: string
}

export interface QuadrantCandidate {
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string
  photoUrl: string | null
  avgSatisfaction: number
  axisX: number
  axisY: number
}

export interface PairingCandidate {
  targetId: string
  name: string
  meta: string
  photoUrl: string | null
  satisfaction: number
  pairingCategories: string[]
}

/**
 * Recommendation Repository 인터페이스
 * infrastructure/repositories/supabase-recommendation-repository.ts에서 구현
 */
export interface RecommendationRepository {
  getRevisitCandidates(userId: string, limit: number): Promise<RevisitCandidate[]>

  getSceneCandidates(userId: string, scene: string, limit: number): Promise<SceneCandidate[]>

  getQuadrantCandidates(userId: string, params: {
    scene?: string
    axisXMin: number
    axisXMax: number
    axisYMin: number
    axisYMax: number
    minSatisfaction: number
  }, limit: number): Promise<QuadrantCandidate[]>

  getAuthorityCandidates(area: string | null, limit: number): Promise<AuthorityCandidate[]>

  getBubbleCandidates(userId: string, limit: number): Promise<BubbleCandidate[]>

  getWinePairingCandidates(wineId: string): Promise<PairingCandidate[]>

  saveRecommendation(userId: string, card: RecommendationCard): Promise<void>

  dismissRecommendation(recommendationId: string): Promise<void>
}
