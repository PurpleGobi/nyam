import type { RestaurantWithSummary, CuisineCategory } from '../entities/restaurant'
import type { UserPreferenceSummary } from '../entities/interaction'
import type { QuickPick } from '../entities/quick-pick'

interface ScoringContext {
  readonly preferenceSummary: UserPreferenceSummary | null
  readonly preferredRegion: string | null
}

/** Compute an average external rating (0-5 scale) across all sources */
function avgExternalRating(restaurant: RestaurantWithSummary): number {
  const validRatings = restaurant.ratings.filter(r => r.rating !== null)
  if (validRatings.length === 0) return 0
  return validRatings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / validRatings.length
}

/** Compute average verification score (0-5 scale) */
function avgVerificationScore(restaurant: RestaurantWithSummary): number {
  const scores = [
    restaurant.avgTaste,
    restaurant.avgValue,
    restaurant.avgService,
    restaurant.avgAmbiance,
  ].filter((s): s is number => s !== null)
  if (scores.length === 0) return 0
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

/** Check how well a cuisine matches user preferences (0-1) */
function cuisineMatchScore(
  cuisine: CuisineCategory,
  summary: UserPreferenceSummary | null,
): number {
  if (!summary || summary.topCuisines.length === 0) return 0.5
  const idx = summary.topCuisines.findIndex(c => c.label === cuisine)
  if (idx === -1) return 0.2
  // Top cuisine = 1.0, second = 0.8, etc.
  return Math.max(0.2, 1 - idx * 0.2)
}

/** Check region proximity to user preference (0-1) */
function regionMatchScore(
  region: string | null,
  context: ScoringContext,
): number {
  if (!region) return 0.3
  if (region === context.preferredRegion) return 1.0
  if (!context.preferenceSummary) return 0.5
  const idx = context.preferenceSummary.topRegions.findIndex(r => r.label === region)
  if (idx === -1) return 0.3
  return Math.max(0.3, 1 - idx * 0.15)
}

/** Data freshness score based on rating fetch time (0-1) */
function freshnessScore(restaurant: RestaurantWithSummary): number {
  if (restaurant.ratings.length === 0) return 0.3
  const latest = restaurant.ratings.reduce((max, r) => {
    const t = new Date(r.fetchedAt).getTime()
    return t > max ? t : max
  }, 0)
  const daysSince = (Date.now() - latest) / (1000 * 60 * 60 * 24)
  if (daysSince < 7) return 1.0
  if (daysSince < 30) return 0.7
  if (daysSince < 90) return 0.4
  return 0.2
}

/**
 * Score a restaurant 0-100 based on ratings, user preferences, and freshness.
 * Pure function.
 *
 * Weights: external ratings 30%, verification 25%, cuisine match 20%,
 *          region proximity 15%, freshness 10%
 */
export function scoreRestaurant(
  restaurant: RestaurantWithSummary,
  context: ScoringContext,
): { score: number; reasons: string[] } {
  const extRating = avgExternalRating(restaurant) / 5        // normalize to 0-1
  const verScore = avgVerificationScore(restaurant) / 5       // normalize to 0-1
  const cuisineMatch = cuisineMatchScore(restaurant.cuisineCategory, context.preferenceSummary)
  const regionMatch = regionMatchScore(restaurant.region, context)
  const freshness = freshnessScore(restaurant)

  const raw =
    extRating * 0.30 +
    verScore * 0.25 +
    cuisineMatch * 0.20 +
    regionMatch * 0.15 +
    freshness * 0.10

  const score = Math.round(raw * 100)

  // Build human-readable reasons
  const reasons: string[] = []
  if (extRating >= 0.8) reasons.push('높은 외부 평점')
  if (verScore >= 0.8) reasons.push('검증 점수 우수')
  if (cuisineMatch >= 0.8) reasons.push('선호 음식 카테고리')
  if (regionMatch >= 0.8) reasons.push('선호 지역')
  if (freshness >= 0.8) reasons.push('최근 업데이트')
  if (reasons.length === 0) reasons.push('종합 추천')

  return { score, reasons }
}

/**
 * Select the top-scoring restaurant as the Quick Pick.
 * Returns null if no restaurants available.
 */
export function selectQuickPick(
  restaurants: readonly RestaurantWithSummary[],
  context: ScoringContext,
): QuickPick | null {
  if (restaurants.length === 0) return null

  let best: QuickPick | null = null

  for (const restaurant of restaurants) {
    const { score, reasons } = scoreRestaurant(restaurant, context)
    if (!best || score > best.score) {
      best = { restaurant, score, reasons }
    }
  }

  return best
}
