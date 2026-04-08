// src/domain/repositories/prediction-repository.ts
// R1: domain 인터페이스 — 외부 의존 0

import type { PredictionResult, PredictionBreakdown } from '@/domain/entities/similarity'
import type { SimilarityCategory } from '@/domain/repositories/similarity-repository'

/** 예측 결과 + breakdown (단건 조회용) */
export interface PredictionWithBreakdown extends PredictionResult {
  breakdown: PredictionBreakdown
}

export interface PredictionRepository {
  /** 단건 Nyam 점수 예측 (식당/와인 상세 페이지) */
  predictScore(
    userId: string,
    itemId: string,
    category: SimilarityCategory,
    scope?: string[],
  ): Promise<PredictionWithBreakdown | null>

  /** 배치 Nyam 점수 예측 (피드/목록, 최대 50건) */
  batchPredict(
    userId: string,
    itemIds: string[],
    category: SimilarityCategory,
  ): Promise<Map<string, { satisfaction: number; confidence: number }>>
}
