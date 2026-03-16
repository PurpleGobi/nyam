'use client'

import useSWR from 'swr'
import type { UserPreferenceSummary } from '@/domain/entities/interaction'
import { interactionRepository } from '@/di/repositories'
import { useAuth } from './use-auth'

interface UsePreferenceSummaryReturn {
  readonly summary: UserPreferenceSummary | null
  readonly isLoading: boolean
  readonly error: Error | undefined
}

/**
 * Hook for fetching the user's aggregated preference summary.
 * Cached with 1-minute deduplication (real-time precision not needed).
 */
export function usePreferenceSummary(): UsePreferenceSummaryReturn {
  const { user } = useAuth()

  const { data, error, isLoading } = useSWR(
    user ? ['preference-summary', user.id] : null,
    () => interactionRepository.getPreferenceSummary(user!.id),
    { dedupingInterval: 60_000 },
  )

  return {
    summary: data ?? null,
    isLoading,
    error,
  }
}
