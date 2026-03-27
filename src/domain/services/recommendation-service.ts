// src/domain/services/recommendation-service.ts
// R1: 외부 의존 0

/**
 * 재방문 추천 점수 계산
 * 높은 만족도 + 오래 안 간 곳 + 방문 횟수 고려
 */
export function calcRevisitScore(
  avgSatisfaction: number,
  daysSinceLastVisit: number,
  visitCount: number,
): number {
  const satFactor = avgSatisfaction / 100
  const timeFactor = Math.min(daysSinceLastVisit / 90, 1)
  const frequencyFactor = Math.min(visitCount / 5, 1)

  return satFactor * 0.5 + timeFactor * 0.3 + frequencyFactor * 0.2
}

/**
 * 권위 추천 점수 계산
 * 평가 수 + 배지 보유 여부
 */
export function calcAuthorityScore(
  ratingCount: number,
  badges: string[],
): number {
  const ratingFactor = Math.min(ratingCount / 50, 1)
  const badgeFactor = badges.length > 0 ? 1 : 0

  return ratingFactor * 0.6 + badgeFactor * 0.4
}
