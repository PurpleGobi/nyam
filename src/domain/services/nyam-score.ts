// src/domain/services/nyam-score.ts
// R1: 외부 의존 0

import type { RestaurantRp } from '@/domain/entities/restaurant'

export interface NyamScoreBreakdown {
  naverRating: number | null
  kakaoRating: number | null
  googleRating: number | null
  webAvg: number              // (N×40% + K×30% + G×30%) / 5.0 × 100
  webScore: number            // webAvg × 20 → 0~100
  prestigeBonus: number       // michelin+8, blueRibbon+5, tv+3, cap 15
  finalScore: number          // webScore × 0.82 + prestigeBonus × 1.15
}

/**
 * Nyam 점수 계산
 * 공식: (Naver×40% + Kakao×30% + Google×30%) × 20 → webScore
 *        미슐랭 +8, 블루리본 +5, TV +3 (상한 15) → prestigeBonus
 *        최종 = webScore × 0.82 + prestigeBonus × 1.15
 *
 * 외부 평점 하나도 없으면 null 반환
 */
export function calcNyamScore(r: {
  naverRating: number | null
  kakaoRating: number | null
  googleRating: number | null
  rp: RestaurantRp[]
}): NyamScoreBreakdown | null {
  const n = r.naverRating
  const k = r.kakaoRating
  const g = r.googleRating

  // 외부 평점 하나도 없으면 산출 불가
  if (n === null && k === null && g === null) return null

  // 가중 평균 (5.0 만점 기준)
  let totalWeight = 0
  let weightedSum = 0
  if (n !== null) { weightedSum += n * 0.4; totalWeight += 0.4 }
  if (k !== null) { weightedSum += k * 0.3; totalWeight += 0.3 }
  if (g !== null) { weightedSum += g * 0.3; totalWeight += 0.3 }
  const webAvg = weightedSum / totalWeight  // 5.0 만점 기준 평균

  // 100점 환산: (webAvg / 5.0) × 100 → 0~100
  const webScore = (webAvg / 5.0) * 100

  // 명성 보너스
  let prestige = 0
  if (r.rp.some(p => p.type === 'michelin')) prestige += 8
  if (r.rp.some(p => p.type === 'blue_ribbon')) prestige += 5
  if (r.rp.some(p => p.type === 'tv')) prestige += 3
  const prestigeBonus = Math.min(prestige, 15)

  // 최종 점수
  const finalScore = Math.min(Math.round(webScore * 0.82 + prestigeBonus * 1.15), 100)

  return {
    naverRating: n,
    kakaoRating: k,
    googleRating: g,
    webAvg,
    webScore,
    prestigeBonus,
    finalScore,
  }
}

/** @deprecated use calcNyamScore instead */
export const calculateNyamScore = calcNyamScore
