// src/domain/entities/score.ts
// R1: 외부 의존 0

/** 점수 출처 */
export type ScoreSource = 'my' | 'following' | 'bubble' | 'nyam'

/** 특정 대상에 대한 4종 점수 */
export interface TargetScores {
  my: { avg: number; count: number } | null
  following: { avg: number; count: number } | null
  bubble: { avg: number; count: number } | null
  nyam: { avg: number; count: number } | null
}

/** 폴백 결과 */
export interface FallbackScore {
  value: number
  source: ScoreSource
  count: number
}
