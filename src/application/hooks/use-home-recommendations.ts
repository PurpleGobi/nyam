'use client'

import useSWR from 'swr'
import { useState, useEffect, useCallback } from 'react'
import type { RestaurantWithSummary, CuisineCategory } from '@/domain/entities/restaurant'
import { supabaseRestaurantRepository } from '@/infrastructure/repositories/supabase-restaurant-repository'

/** Filter state for home recommendations */
export interface HomeFilter {
  readonly region: string | null
  readonly cuisineCategory: CuisineCategory | null
  readonly situation: string | null
  readonly partySize: string | null
  readonly budget: string | null
}

interface UseHomeRecommendationsReturn {
  readonly restaurants: readonly RestaurantWithSummary[]
  readonly mealLabel: string
  /** Auto-detected region from geolocation */
  readonly detectedRegion: string | null
  /** Current active filter */
  readonly filter: HomeFilter
  /** Update a single filter field */
  readonly setFilter: <K extends keyof HomeFilter>(key: K, value: HomeFilter[K]) => void
  /** Reset all filters (keep auto-detected region) */
  readonly resetFilters: () => void
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
    restaurantIds.map(id => supabaseRestaurantRepository.findById(id))
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
 * Supports chip-based filters auto-filled from geolocation.
 */
export function useHomeRecommendations(): UseHomeRecommendationsReturn {
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null)
  const [filter, setFilterState] = useState<HomeFilter>(DEFAULT_FILTER)

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
              setFilterState(prev => ({
                ...prev,
                region: prev.region ?? data.region,
              }))
            }
          }
        } catch {
          // Geolocation enrichment is non-critical
        }
      },
      () => {
        // Permission denied or error - proceed without region
      },
      { timeout: 5000, maximumAge: 300000 }
    )
  }, [])

  const setFilter = useCallback(<K extends keyof HomeFilter>(key: K, value: HomeFilter[K]) => {
    setFilterState(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilterState({ ...DEFAULT_FILTER, region: detectedRegion })
  }, [detectedRegion])

  const { data, error, isLoading } = useSWR(
    ['home-recommendations', filter.region, filter.cuisineCategory],
    () => fetchRecommendations(filter.region, filter.cuisineCategory),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    restaurants: data?.restaurants ?? [],
    mealLabel: data?.mealLabel ?? '',
    detectedRegion,
    filter,
    setFilter,
    resetFilters,
    isLoading,
    error,
  }
}
