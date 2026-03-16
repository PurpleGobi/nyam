'use client'

import useSWR from 'swr'
import type { Badge, BadgeWithStatus } from '@/domain/entities/badge'
import { badgeRepository } from '@/di/repositories'
import { useAuth } from './use-auth'

interface UseAllBadgesReturn {
  readonly badges: readonly Badge[]
  readonly isLoading: boolean
  readonly error: Error | undefined
}

/**
 * Hook for fetching all badge definitions.
 */
export function useAllBadges(): UseAllBadgesReturn {
  const { data, error, isLoading } = useSWR<readonly Badge[]>(
    ['badges', 'all'],
    () => badgeRepository.findAll(),
  )

  return {
    badges: data ?? [],
    isLoading,
    error,
  }
}

interface UseMyBadgesReturn {
  readonly earnedBadges: readonly BadgeWithStatus[]
  readonly isLoading: boolean
  readonly error: Error | undefined
}

/**
 * Hook for fetching the current user's badges with earning status.
 */
export function useMyBadges(): UseMyBadgesReturn {
  const { user } = useAuth()

  const { data, error, isLoading } = useSWR<readonly BadgeWithStatus[]>(
    user ? ['badges', 'user', user.id] : null,
    () => badgeRepository.findByUser(user!.id),
  )

  return {
    earnedBadges: data ?? [],
    isLoading,
    error,
  }
}
