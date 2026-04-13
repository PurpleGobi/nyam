// src/domain/services/score-fallback.ts
// R1: 외부 의존 0

import type { TargetScores, FallbackScore, ScoreSource } from '@/domain/entities/score'
import { SOURCE_PRIORITY } from '@/domain/constants/source-priority'

/** 점수 폴백: 나 → nyam → 버블 */
const PRIORITY: ScoreSource[] = [...SOURCE_PRIORITY]

/** 신뢰도 우선 폴백: 나 → nyam → 버블 */
export function getScoreFallback(scores: TargetScores): FallbackScore | null {
  for (const source of PRIORITY) {
    const data = scores[source]
    if (data !== null) {
      return { value: data.avg, source, count: data.count }
    }
  }
  return null
}

/**
 * 버블 확신도 heuristic (CF LAMBDA=7 동일).
 * raterCount / (raterCount + LAMBDA) → 1명 12%, 3명 30%, 7명 50%, 20명 74%
 * CF 예측 연동 시 이 함수를 대체.
 */
const LAMBDA = 7
export function computeBubbleConfidence(raterCount: number): number {
  if (raterCount <= 0) return 0
  return raterCount / (raterCount + LAMBDA)
}
