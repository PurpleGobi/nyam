// src/domain/entities/similarity.ts
// R1: 외부 의존 0

/** 유저 쌍 적합도 계산 결과 */
export interface SimilarityResult {
  similarity: number // 0~1
  confidence: number // 0~1
  nOverlap: number // 겹치는 기록 수
}

/** CF 예측 결과 (2D 좌표 + 만족도 + 확신도) */
export interface PredictionResult {
  predictedX: number // 0~100
  predictedY: number // 0~100
  satisfaction: number // (predictedX + predictedY) / 2
  confidence: number // 0~1 (예측 확신도)
  nRaters: number // 유효 평가자 수
}

/** 예측 기여자 상세 (UI breakdown용, Phase 2+에서 사용) */
export interface PredictionBreakdown {
  followingRaters: RaterDetail[]
  otherRaters: {
    count: number
    avgSimilarity: number
    avgScore: number
  }
}

/** 개별 기여자 상세 */
export interface RaterDetail {
  userId: string
  nickname: string
  similarity: number
  score: number
  boost: number
}

/** 관계 유형 (부스트 판정용) */
export type RelationType = 'following' | 'none'

/** 2D 좌표 (mean-centering 입출력용) */
export interface ScorePoint {
  x: number
  y: number
}

/** 예측 계산 입력용 평가자 데이터 */
export interface RaterInput {
  deviation: ScorePoint // mean-centered 편차 (상대X - 상대평균X, 상대Y - 상대평균Y)
  similarity: number
  confidence: number
  boost: number
}
