'use client'

import useSWR from 'swr'
import { useState, useEffect } from 'react'
import type { RestaurantWithSummary } from '@/domain/entities/restaurant'
import { supabaseRestaurantRepository } from '@/infrastructure/repositories/supabase-restaurant-repository'

interface UseHomeRecommendationsReturn {
  readonly restaurants: readonly RestaurantWithSummary[]
  readonly mealLabel: string
  readonly region: string | null
  readonly isLoading: boolean
  readonly error: Error | undefined
}

async function fetchRecommendations(region: string | null): Promise<{
  restaurants: readonly RestaurantWithSummary[]
  mealLabel: string
}> {
  const url = new URL('/api/restaurants/recommend', window.location.origin)
  if (region) url.searchParams.set('region', region)
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

/**
 * Hook for home page time-based + location-based restaurant recommendations.
 * Uses browser geolocation to detect region (falls back to null).
 */
export function useHomeRecommendations(): UseHomeRecommendationsReturn {
  const [region, setRegion] = useState<string | null>(null)

  // Try to detect region from geolocation
  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use Kakao reverse geocoding to get region name
          const { latitude, longitude } = position.coords
          const res = await fetch(
            `/api/restaurants/geocode?lat=${latitude}&lng=${longitude}`
          )
          if (res.ok) {
            const data = await res.json() as { region: string | null }
            if (data.region) setRegion(data.region)
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

  const { data, error, isLoading } = useSWR(
    ['home-recommendations', region],
    () => fetchRecommendations(region),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,  // Don't re-fetch within 1 minute
    }
  )

  return {
    restaurants: data?.restaurants ?? [],
    mealLabel: data?.mealLabel ?? '',
    region,
    isLoading,
    error,
  }
}
