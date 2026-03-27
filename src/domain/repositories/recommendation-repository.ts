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
  ratingCount: number
  badges: string[]
}

export interface BubbleCandidate {
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string
  photoUrl: string | null
  bubbleName: string
  avgSatisfaction: number
}

/**
 * Recommendation Repository 인터페이스
 * infrastructure/repositories/supabase-recommendation-repository.ts에서 구현
 */
export interface RecommendationRepository {
  getRevisitCandidates(userId: string): Promise<RevisitCandidate[]>

  getAuthorityCandidates(): Promise<AuthorityCandidate[]>

  getBubbleCandidates(userId: string): Promise<BubbleCandidate[]>

  saveRecommendation(card: RecommendationCard): Promise<void>

  dismissRecommendation(recommendationId: string): Promise<void>
}
