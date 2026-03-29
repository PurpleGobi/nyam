// src/domain/services/discover-scoring.ts
// R1: 외부 의존 0
// Discover 스코어링 공식 (SSOT)

/**
 * Discover 스코어링 원칙 (100점 만점)
 *
 * ┌──────────────┬──────┬────────────────────────────────────┐
 * │ 카테고리      │ 배점 │ 계산 방식                           │
 * ├──────────────┼──────┼────────────────────────────────────┤
 * │ 구글 평점     │ 70점 │ (rating - 3.0) / 2.0 × 70         │
 * │              │      │ 3.0 미만 = 0점, 5.0 = 70점         │
 * ├──────────────┼──────┼────────────────────────────────────┤
 * │ 수상/출연     │ 30점 │ 최고 등급 1개 + 나머지 × 0.3       │
 * │              │      │ S등급 = 15, A등급 = 10, B등급 = 5   │
 * │              │      │ 최대 30점 cap                       │
 * └──────────────┴──────┴────────────────────────────────────┘
 */

export interface Accolade {
  source: string
  detail: string | null
  prestigeTier: 'S' | 'A' | 'B'
}

export interface ScoreBreakdown {
  googleScore: number
  accoladeScore: number
  accolades: Accolade[]
  total: number
}

const TIER_POINTS: Record<string, number> = { S: 15, A: 10, B: 5 }

/** 구글 평점 → 점수 (0~70) */
function googleRatingToScore(rating: number | null): number {
  if (rating === null || rating <= 3.0) return 0
  return Math.round(((rating - 3.0) / 2.0) * 70 * 10) / 10
}

/** 수상 목록 → 점수 (0~30) */
function accoladesToScore(accolades: Accolade[]): number {
  if (accolades.length === 0) return 0
  // 높은 등급순 정렬
  const sorted = [...accolades].sort((a, b) => (TIER_POINTS[b.prestigeTier] ?? 0) - (TIER_POINTS[a.prestigeTier] ?? 0))
  // 최고 1개 풀 점수 + 나머지 30%
  let score = TIER_POINTS[sorted[0].prestigeTier] ?? 0
  for (let i = 1; i < sorted.length; i++) {
    score += (TIER_POINTS[sorted[i].prestigeTier] ?? 0) * 0.3
  }
  return Math.min(30, Math.round(score * 10) / 10)
}

export function calculateScore(googleRating: number | null, accolades: Accolade[]): ScoreBreakdown {
  const googleScore = googleRatingToScore(googleRating)
  const accoladeScore = accoladesToScore(accolades)
  return {
    googleScore,
    accoladeScore,
    accolades,
    total: Math.min(100, Math.round((googleScore + accoladeScore) * 10) / 10),
  }
}

/** 점수 breakdown → 사람이 읽을 수 있는 요약 */
export function formatBreakdownText(b: ScoreBreakdown): string {
  const parts: string[] = []
  if (b.googleScore > 0) parts.push(`구글 ${b.googleScore}`)
  if (b.accoladeScore > 0) parts.push(`수상 ${b.accoladeScore}`)
  return parts.join(' + ')
}
