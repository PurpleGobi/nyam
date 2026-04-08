// src/domain/entities/score.ts
// R1: 외부 의존 0

/** 점수 출처 */
export type ScoreSource = 'mine' | 'nyam' | 'bubble'

/** 특정 대상에 대한 3종 점수 */
export interface TargetScores {
  mine: { avg: number; count: number } | null
  nyam: { avg: number; count: number; confidence: number } | null
  bubble: { avg: number; count: number } | null
}

/** 폴백 결과 */
export interface FallbackScore {
  value: number
  source: ScoreSource
  count: number
}
