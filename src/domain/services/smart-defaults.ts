import type { CuisineCategory } from '../entities/restaurant'
import type { UserTasteProfile } from '../entities/user-taste'
import type { UserPreferenceSummary } from '../entities/interaction'

export interface HomeFilter {
  readonly region: string | null
  readonly cuisineCategory: CuisineCategory | null
  readonly situation: string | null
  readonly partySize: string | null
  readonly budget: string | null
}

interface SmartDefaultsInput {
  readonly timeHour: number
  readonly detectedRegion: string | null
  readonly tasteProfile: UserTasteProfile | null
  readonly preferenceSummary: UserPreferenceSummary | null
}

/** Map time-of-day to a likely situation preset id */
function inferSituation(
  hour: number,
  preferenceSummary: UserPreferenceSummary | null,
): string | null {
  const topSituation = preferenceSummary?.topSituations[0]?.label ?? null

  // If user has a strong preference, use it
  if (topSituation) return topSituation

  // Time-based heuristics
  if (hour >= 11 && hour < 14) return 'solo-dining'
  if (hour >= 18 && hour < 21) return 'friends-gathering'
  return null
}

/** Map time-of-day to a likely cuisine when no user preference */
function inferCuisine(
  hour: number,
  preferenceSummary: UserPreferenceSummary | null,
): CuisineCategory | null {
  const topCuisine = preferenceSummary?.topCuisines[0]?.label as CuisineCategory | undefined

  if (topCuisine) {
    // Afternoon → override to cafe if user frequently visits
    if (hour >= 14 && hour < 17) {
      const hasCafe = preferenceSummary?.topCuisines.some(c => c.label === '카페')
      if (hasCafe) return '카페'
    }
    return topCuisine
  }

  // Time-based fallback
  if (hour >= 14 && hour < 17) return '카페'
  return null
}

/**
 * Compute smart filter defaults from time, location, and user preferences.
 * Pure function — no React or external deps.
 */
export function computeSmartDefaults(input: SmartDefaultsInput): HomeFilter {
  const { timeHour, detectedRegion, preferenceSummary } = input

  // Region: detected location first, then user's top region
  const region =
    detectedRegion ??
    (preferenceSummary?.topRegions[0]?.label ?? null)

  return {
    region,
    cuisineCategory: inferCuisine(timeHour, preferenceSummary),
    situation: inferSituation(timeHour, preferenceSummary),
    partySize: null,
    budget: null,
  }
}
