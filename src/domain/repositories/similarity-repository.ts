// src/domain/repositories/similarity-repository.ts
// R1: domain 인터페이스 — 외부 의존 0

import type { SimilarityResult } from '@/domain/entities/similarity'

/** 카테고리 타입 (식당/와인 적합도는 별개 산출) */
export type SimilarityCategory = 'restaurant' | 'wine'

/** 유저 평균 점수 */
export interface UserScoreMean {
  meanX: number
  meanY: number
  recordCount: number
}

/** 적합도 + 유저 정보 (조회용) */
export interface UserSimilarityRow {
  userA: string
  userB: string
  category: SimilarityCategory
  similarity: number
  confidence: number
  nOverlap: number
}

export interface SimilarityRepository {
  /** 두 유저 간 적합도 조회 (순서 무관 — 내부에서 정규화) */
  getSimilarity(
    userA: string,
    userB: string,
    category: SimilarityCategory,
  ): Promise<SimilarityResult | null>

  /** 특정 유저의 모든 적합도 조회 (user_a 또는 user_b에 해당) */
  getSimilaritiesForUser(
    userId: string,
    category: SimilarityCategory,
  ): Promise<UserSimilarityRow[]>

  /** 유저의 평균 점수 조회 */
  getUserScoreMean(
    userId: string,
    category: SimilarityCategory,
  ): Promise<UserScoreMean | null>
}
