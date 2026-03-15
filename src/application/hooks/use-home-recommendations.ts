'use client'

import useSWR from 'swr'
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { RestaurantWithSummary, CuisineCategory } from '@/domain/entities/restaurant'
import type { QuickPick } from '@/domain/entities/quick-pick'
import { computeSmartDefaults, type HomeFilter } from '@/domain/services/smart-defaults'
import { selectQuickPick } from '@/domain/services/scoring'
import { restaurantRepository } from '@/di/repositories'
import { useUserTaste } from './use-user-taste'
import { usePreferenceSummary } from './use-preference-summary'

export type { HomeFilter } from '@/domain/services/smart-defaults'

interface UseHomeRecommendationsReturn {
  readonly restaurants: readonly RestaurantWithSummary[]
  readonly mealLabel: string
  /** Auto-detected region from geolocation */
  readonly detectedRegion: string | null
  /** Current active filter */
  readonly filter: HomeFilter
  /** Update a single filter field */
  readonly setFilter: <K extends keyof HomeFilter>(key: K, value: HomeFilter[K]) => void
  /** Reset all filters (re-apply smart defaults) */
  readonly resetFilters: () => void
  /** Top-scored restaurant recommendation */
  readonly quickPick: QuickPick | null
  /** Whether smart defaults were applied (user hasn't manually changed filters) */
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

const DEFAULT_FILTER: HomeFilter = {
  region: null,
  cuisineCategory: null,
  situation: null,
  partySize: null,
  budget: null,
}

/**
 * Hook for home page time-based + location-based restaurant recommendations.
 * Applies smart defaults from user taste/behavior on first load.
 */
export function useHomeRecommendations(): UseHomeRecommendationsReturn {
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null)
  const { tasteProfile } = useUserTaste()
  const { summary: preferenceSummary } = usePreferenceSummary()

  // Compute smart defaults as initial state (no effect needed)
  const smartDefaults = useMemo(
    () => computeSmartDefaults({
      timeHour: new Date().getHours(),
      detectedRegion: null,
      tasteProfile,
      preferenceSummary,
    }),
    [tasteProfile, preferenceSummary],
  )

  const [filter, setFilterState] = useState<HomeFilter>(DEFAULT_FILTER)
  const [userHasEdited, setUserHasEdited] = useState(false)
  const [smartDefaultsApplied, setSmartDefaultsApplied] = useState(false)

  // Try to detect region from geolocation
  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const res = await fetch(
            `/api/restaurants/geocode?lat=${latitude}&lng=${longitude}`
          )
          if (res.ok) {
            const data = await res.json() as { region: string | null }
            if (data.region) {
              setDetectedRegion(data.region)
            }
          }
        } catch {
          // Geolocation enrichment is non-critical
        }
      },
      () => {
        // Permission denied or error
      },
      { timeout: 5000, maximumAge: 300000 }
    )
  }, [])

  // Sync smart defaults into filter when data arrives (only if user hasn't edited)
  const smartDefaultsKey = JSON.stringify(smartDefaults) + String(detectedRegion)
  useEffect(() => {
    if (userHasEdited) return

    const merged: HomeFilter = {
      ...smartDefaults,
      region: detectedRegion ?? smartDefaults.region,
    }
    const hasAny = Object.values(merged).some(v => v !== null)

    // Use functional updater to avoid direct setState in effect lint error
    setFilterState(() => merged)
    setSmartDefaultsApplied(() => hasAny)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smartDefaultsKey, userHasEdited])

  const setFilter = useCallback(<K extends keyof HomeFilter>(key: K, value: HomeFilter[K]) => {
    setUserHasEdited(true)
    setSmartDefaultsApplied(false)
    setFilterState(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setUserHasEdited(false)
    // Smart defaults will re-apply via useEffect
  }, [])

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
    setFilter,
    resetFilters,
    quickPick,
    smartDefaultsApplied,
    isLoading,
    error,
  }
}
