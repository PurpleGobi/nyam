'use client'

import useSWR from 'swr'
import type { RestaurantWithSummary } from '@/domain/entities/restaurant'
import { supabaseRestaurantRepository } from '@/infrastructure/repositories/supabase-restaurant-repository'

interface SearchParams {
  readonly query?: string
  readonly region?: string
  readonly cuisineCategory?: string
  readonly page?: number
  readonly limit?: number
}

interface UseRestaurantSearchReturn {
  readonly restaurants: readonly RestaurantWithSummary[]
  readonly total: number
  readonly hasMore: boolean
  readonly isLoading: boolean
  readonly error: Error | undefined
}

async function searchAndFetch(params: SearchParams): Promise<{
  restaurants: readonly RestaurantWithSummary[]
  total: number
  hasMore: boolean
}> {
  // Step 1: Search external APIs and cache to Supabase
  const searchUrl = new URL('/api/restaurants/search', window.location.origin)
  if (params.query) searchUrl.searchParams.set('query', params.query)
  if (params.region) searchUrl.searchParams.set('region', params.region)
  if (params.cuisineCategory) searchUrl.searchParams.set('category', params.cuisineCategory)
  if (params.page) searchUrl.searchParams.set('page', String(params.page))
  if (params.limit) searchUrl.searchParams.set('limit', String(params.limit))

  const response = await fetch(searchUrl.toString())
  if (!response.ok) throw new Error('Restaurant search failed')

  const { restaurantIds, total, hasMore } = await response.json() as {
    restaurantIds: string[]
    total: number
    hasMore: boolean
  }

  if (restaurantIds.length === 0) {
    return { restaurants: [], total: 0, hasMore: false }
  }

  // Step 2: Fetch full restaurant data from Supabase (with verification summaries)
  const restaurantPromises = restaurantIds.map(id =>
    supabaseRestaurantRepository.findById(id)
  )
  const results = await Promise.all(restaurantPromises)
  const restaurants = results.filter((r): r is RestaurantWithSummary => r !== null)

  return { restaurants, total, hasMore }
}

/**
 * Hook for searching restaurants via external APIs (Kakao + Naver).
 * Falls back to empty results when APIs are unavailable.
 */
export function useRestaurantSearch(params: SearchParams): UseRestaurantSearchReturn {
  const hasSearchCriteria = !!(params.query || params.region || params.cuisineCategory)

  const { data, error, isLoading } = useSWR(
    hasSearchCriteria ? ['restaurant-search', params] : null,
    () => searchAndFetch(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  )

  return {
    restaurants: data?.restaurants ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    error,
  }
}
