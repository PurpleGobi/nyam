// src/domain/services/nyam-score.ts
// R1: 외부 의존 0

export interface NyamScoreBreakdown {
  naverRating: number | null
  kakaoRating: number | null
  googleRating: number | null
  webAvg: number | null
  webScore: number | null
  prestigeBonus: number
  finalScore: number | null
}

/**
 * Nyam 점수 계산
 * Web Score = (Naver×0.4 + Kakao×0.3 + Google×0.3) × 20 → 0~100
 * Prestige Bonus = Michelin +8, BlueRibbon +5, TV +3 (max 15)
 * Final = Web Score × 0.82 + Prestige Bonus × 1.15
 */
export function calculateNyamScore(params: {
  naverRating: number | null
  kakaoRating: number | null
  googleRating: number | null
  michelinStars: number | null
  hasBlueRibbon: boolean
  mediaCount: number
}): NyamScoreBreakdown {
  const { naverRating, kakaoRating, googleRating, michelinStars, hasBlueRibbon, mediaCount } = params

  const ratings = [
    { value: naverRating, weight: 0.4 },
    { value: kakaoRating, weight: 0.3 },
    { value: googleRating, weight: 0.3 },
  ].filter((r) => r.value !== null)

  let webAvg: number | null = null
  let webScore: number | null = null

  if (ratings.length > 0) {
    const totalWeight = ratings.reduce((sum, r) => sum + r.weight, 0)
    webAvg = ratings.reduce((sum, r) => sum + (r.value as number) * r.weight, 0) / totalWeight
    webScore = webAvg * 20
  }

  let prestigeBonus = 0
  if (michelinStars) prestigeBonus += 8
  if (hasBlueRibbon) prestigeBonus += 5
  if (mediaCount > 0) prestigeBonus += 3
  prestigeBonus = Math.min(prestigeBonus, 15)

  const finalScore = webScore !== null
    ? Math.round(webScore * 0.82 + prestigeBonus * 1.15)
    : null

  return { naverRating, kakaoRating, googleRating, webAvg, webScore, prestigeBonus, finalScore }
}
