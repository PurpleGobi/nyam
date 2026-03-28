// src/domain/services/recommendation-service.ts
// R1: 외부 의존 0

/**
 * 재방문 추천 점수 계산 (RECOMMENDATION.md §2-1)
 * 60% 내 평가 + 30% 오래 안 감 + 10% 재방문 보너스
 */
export function calcRevisitScore(
  avgSatisfaction: number,
  daysSinceLastVisit: number,
  visitCount: number,
): number {
  const ratingScore = avgSatisfaction * 0.6
  const recencyScore = Math.min(daysSinceLastVisit * 0.002 * 100, 100) * 0.3
  const revisitBonus = Math.min(visitCount, 5) * 4 * 0.1
  return ratingScore + recencyScore + revisitBonus
}

/**
 * 권위 추천 점수 계산 (RECOMMENDATION.md §2-5, §6)
 * 외부 평점 평균 → 100점 정규화 + 뱃지 가산
 */
export function calcAuthorityScore(params: {
  naverRating: number | null
  kakaoRating: number | null
  googleRating: number | null
  michelinStars: number | null
  hasBlueRibbon: boolean
}): number {
  const ratings = [params.naverRating, params.kakaoRating, params.googleRating]
    .filter((r): r is number => r !== null)
  if (ratings.length === 0) return 0

  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
  const ratingScore = (avgRating / 5) * 100

  let badgeBonus = 0
  if (params.michelinStars) badgeBonus += params.michelinStars * 5
  if (params.hasBlueRibbon) badgeBonus += 5

  return Math.min(ratingScore + badgeBonus, 100)
}

/**
 * 버블 추천 점수 계산 (RECOMMENDATION.md §6)
 * 멤버 만족도 * (1 + log(평가 멤버 수))
 */
export function calcBubbleScore(
  memberSatisfaction: number,
  ratingMemberCount: number,
): number {
  return Math.min(
    memberSatisfaction * (1 + Math.log10(Math.max(ratingMemberCount, 1))),
    100,
  )
}

/**
 * 찜 리마인드 정렬 점수 (RECOMMENDATION.md §2-4)
 * proximity 60% + age 40%
 */
export function calcBookmarkScore(
  distanceKm: number,
  daysSinceBookmark: number,
): number {
  const proximity = (1 / (distanceKm + 1)) * 0.6
  const age = (daysSinceBookmark * 0.01) * 0.4
  return (proximity + age) * 100
}

/**
 * 추천 병합 정렬 (RECOMMENDATION.md §6)
 * normalizedScore DESC, 동점 시 최신 우선
 */
export function mergeRecommendations<T extends { normalizedScore: number }>(
  ...lists: T[][]
): T[] {
  const all = lists.flat()
  return all.sort((a, b) => b.normalizedScore - a.normalizedScore)
}
