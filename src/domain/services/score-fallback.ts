// src/domain/services/score-fallback.ts
// R1: 외부 의존 0

import type { TargetScores, FallbackScore, ScoreSource } from '@/domain/entities/score'
import { SOURCE_PRIORITY } from '@/domain/constants/source-priority'

/** 점수 폴백에 사용할 소스 (bookmark 제외한 4종) */
const PRIORITY: ScoreSource[] = SOURCE_PRIORITY.filter(
  (s): s is ScoreSource => s !== 'bookmark',
)

/** 신뢰도 우선 폴백: 나 → 팔로잉 → 버블 → nyam */
export function getScoreFallback(scores: TargetScores): FallbackScore | null {
  for (const source of PRIORITY) {
    const data = scores[source]
    if (data !== null) {
      return { value: data.avg, source, count: data.count }
    }
  }
  return null
}
