'use client'

import useSWR from 'swr'
import type { RestaurantWithSummary } from '@/domain/entities/restaurant'
import type { RestaurantFilter, PaginationOptions, PaginatedResult } from '@/domain/repositories/restaurant-repository'
import { supabaseRestaurantRepository } from '@/infrastructure/repositories/supabase-restaurant-repository'
import { mockRestaurantRepository } from '@/infrastructure/repositories/mock-restaurant-repository'

interface UseRestaurantsParams {
  readonly filter?: RestaurantFilter
  readonly pagination?: PaginationOptions
}

interface UseRestaurantsReturn {
  readonly restaurants: readonly RestaurantWithSummary[]
  readonly total: number
  readonly isLoading: boolean
  readonly error: Error | undefined
}

/**
 * Fetcher that tries Supabase first, falls back to mock data on error.
 */
async function fetchRestaurants(
  filter?: RestaurantFilter,
  pagination?: PaginationOptions,
): Promise<PaginatedResult<RestaurantWithSummary>> {
  try {
    return await supabaseRestaurantRepository.findMany(filter, pagination)
  } catch {
    // Supabase unavailable — use mock data
    return mockRestaurantRepository.findMany(filter, pagination)
  }
}

/**
 * Hook for fetching restaurant listings with filters and pagination.
 * Uses SWR for caching and revalidation.
 * Falls back to mock data when Supabase is unavailable.
 */
export function useRestaurants(params?: UseRestaurantsParams): UseRestaurantsReturn {
  const { filter, pagination } = params ?? {}

  const { data, error, isLoading } = useSWR<PaginatedResult<RestaurantWithSummary>>(
    ['restaurants', filter, pagination],
    () => fetchRestaurants(filter, pagination),
  )

  return {
    restaurants: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
  }
}
