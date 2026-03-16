'use client'

import useSWR from 'swr'
import type { RestaurantWithSummary } from '@/domain/entities/restaurant'
import { restaurantRepository } from '@/di/repositories'

interface UseRestaurantDetailReturn {
  readonly restaurant: RestaurantWithSummary | null
  readonly isLoading: boolean
  readonly error: Error | undefined
}

/**
 * Hook for fetching a single restaurant with verification summary.
 * The repository's findById already returns RestaurantWithSummary which includes
 * verification counts, average scores, and verification level.
 */
export function useRestaurantDetail(id: string | undefined): UseRestaurantDetailReturn {
  const { data, error, isLoading } = useSWR<RestaurantWithSummary | null>(
    id ? ['restaurant', id] : null,
    () => restaurantRepository.findById(id!),
  )

  return {
    restaurant: data ?? null,
    isLoading,
    error,
  }
}
