// src/domain/entities/score.ts
// R1: 외부 의존 0

/** 점수 출처 */
export type ScoreSource = 'mine' | 'nyam' | 'bubble'

/** 개별 버블 점수 */
export interface BubbleScoreEntry {
  bubbleId: string
  bubbleName: string
  icon: string | null
  iconBgColor: string | null
  score: number | null      // CF 예측 점수 또는 단순 평균
  confidence: number        // 확신도 0~1
  memberCount: number       // 버블 멤버 수
  raterCount: number        // 해당 아이템을 기록한 멤버 수
}

/** 특정 대상에 대한 3종 점수 */
export interface TargetScores {
  mine: { avg: number; count: number } | null
  nyam: { avg: number; count: number; confidence: number } | null
  bubble: { avg: number; count: number; confidence: number } | null
}

/** 폴백 결과 */
export interface FallbackScore {
  value: number
  source: ScoreSource
  count: number
}
