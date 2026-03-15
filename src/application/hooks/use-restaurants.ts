'use client'

import useSWR from 'swr'
import type { RestaurantWithSummary } from '@/domain/entities/restaurant'
import type { RestaurantFilter, PaginationOptions, PaginatedResult } from '@/domain/repositories/restaurant-repository'
import { restaurantRepository } from '@/di/repositories'

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
 * Hook for fetching restaurant listings with filters and pagination.
 * Uses SWR for caching and revalidation.
 */
export function useRestaurants(params?: UseRestaurantsParams): UseRestaurantsReturn {
  const { filter, pagination } = params ?? {}

  const { data, error, isLoading } = useSWR<PaginatedResult<RestaurantWithSummary>>(
    ['restaurants', filter, pagination],
    () => restaurantRepository.findMany(filter, pagination),
  )

  return {
    restaurants: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
  }
}
