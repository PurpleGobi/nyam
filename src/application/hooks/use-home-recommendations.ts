'use client'

import useSWR from 'swr'
import { useEffect, useCallback, useMemo, useState } from 'react'
import type { RestaurantWithSummary, CuisineCategory } from '@/domain/entities/restaurant'
import type { QuickPick } from '@/domain/entities/quick-pick'
import { computeSmartDefaults } from '@/domain/services/smart-defaults'
import { selectQuickPick } from '@/domain/services/scoring'
import { restaurantRepository } from '@/di/repositories'
import { useFilterContext, type UnifiedFilter } from '@/application/contexts/filter-context'
import { useUserTaste } from './use-user-taste'
import { usePreferenceSummary } from './use-preference-summary'

export type HomeFilter = UnifiedFilter

interface UseHomeRecommendationsReturn {
  readonly restaurants: readonly RestaurantWithSummary[]
  readonly mealLabel: string
  readonly detectedRegion: string | null
  readonly filter: UnifiedFilter
  readonly setFilter: <K extends keyof UnifiedFilter>(key: K, value: UnifiedFilter[K]) => void
  readonly resetFilters: () => void
  readonly quickPick: QuickPick | null
  readonly smartDefaultsApplied: boolean
  readonly isLoading: boolean
  readonly error: Error | undefined
}

async function fetchRecommendations(
  region: string | null,
  cuisineCategory: CuisineCategory | null,
): Promise<{
  restaurants: readonly RestaurantWithSummary[]
  mealLabel: string
}> {
  const url = new URL('/api/restaurants/recommend', window.location.origin)
  if (region) url.searchParams.set('region', region)
  if (cuisineCategory) url.searchParams.set('cuisine', cuisineCategory)
  url.searchParams.set('limit', '6')

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error('Failed to fetch recommendations')

  const { restaurantIds, mealLabel } = await response.json() as {
    restaurantIds: string[]
    mealLabel: string
  }

  if (restaurantIds.length === 0) {
    return { restaurants: [], mealLabel }
  }

  const results = await Promise.all(
    restaurantIds.map(id => restaurantRepository.findById(id))
  )

  return {
    restaurants: results.filter((r): r is RestaurantWithSummary => r !== null),
    mealLabel,
  }
}

/**
 * Hook for home page time-based + location-based restaurant recommendations.
 * Uses the shared FilterContext so filters carry over to explore/compare.
 * Applies smart defaults from user taste/behavior on first load.
 */
export function useHomeRecommendations(): UseHomeRecommendationsReturn {
  const { filter, detectedRegion, setFilter, resetFilters } = useFilterContext()
  const { tasteProfile } = useUserTaste()
  const { summary: preferenceSummary } = usePreferenceSummary()

  const [smartDefaultsApplied, setSmartDefaultsApplied] = useState(false)
  const [hasAppliedDefaults, setHasAppliedDefaults] = useState(false)

  // Apply smart defaults once on first load (when taste data arrives)
  const smartDefaultsKey = `${tasteProfile?.userId ?? 'anon'}-${preferenceSummary?.computedAt ?? 'none'}-${detectedRegion ?? 'none'}`
  useEffect(() => {
    if (hasAppliedDefaults) return

    const smartFilter = computeSmartDefaults({
      timeHour: new Date().getHours(),
      detectedRegion,
      tasteProfile,
      preferenceSummary,
    })

    const hasAny = Object.values(smartFilter).some(v => v !== null)
    if (!hasAny) return

    // Apply each smart default to shared context
    if (smartFilter.region) setFilter('region', smartFilter.region)
    if (smartFilter.cuisineCategory) setFilter('cuisineCategory', smartFilter.cuisineCategory)
    if (smartFilter.situation) setFilter('situation', smartFilter.situation)

    setSmartDefaultsApplied(() => true)
    setHasAppliedDefaults(() => true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smartDefaultsKey])

  const handleSetFilter = useCallback(<K extends keyof UnifiedFilter>(key: K, value: UnifiedFilter[K]) => {
    setSmartDefaultsApplied(false)
    setFilter(key, value)
  }, [setFilter])

  const handleResetFilters = useCallback(() => {
    setSmartDefaultsApplied(false)
    setHasAppliedDefaults(false)
    resetFilters()
  }, [resetFilters])

  const { data, error, isLoading } = useSWR(
    ['home-recommendations', filter.region, filter.cuisineCategory],
    () => fetchRecommendations(filter.region, filter.cuisineCategory),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  const restaurants = data?.restaurants ?? []

  const quickPick = useMemo(() => {
    if (restaurants.length === 0) return null
    return selectQuickPick(restaurants, {
      preferenceSummary,
      preferredRegion: filter.region,
    })
  }, [restaurants, preferenceSummary, filter.region])

  return {
    restaurants,
    mealLabel: data?.mealLabel ?? '',
    detectedRegion,
    filter,
    setFilter: handleSetFilter,
    resetFilters: handleResetFilters,
    quickPick,
    smartDefaultsApplied,
    isLoading,
    error,
  }
}
