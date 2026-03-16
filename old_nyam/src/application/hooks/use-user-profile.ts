'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import type { UserProfile, UserStats } from '@/domain/entities/user'
import type { UpdateUserProfileInput } from '@/domain/repositories/user-repository'
import { userRepository } from '@/di/repositories'

interface UseUserProfileReturn {
  readonly profile: UserProfile | null
  readonly stats: UserStats | null
  readonly isLoading: boolean
  readonly error: Error | undefined
  readonly updateProfile: (input: UpdateUserProfileInput) => Promise<UserProfile>
}

/**
 * Hook for fetching and updating a user profile with stats.
 */
export function useUserProfile(userId: string | undefined): UseUserProfileReturn {
  const {
    data: profile,
    error: profileError,
    isLoading: profileLoading,
    mutate: mutateProfile,
  } = useSWR<UserProfile | null>(
    userId ? ['profile', userId] : null,
    () => userRepository.findById(userId!),
  )

  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR<UserStats>(
    userId ? ['profile-stats', userId] : null,
    () => userRepository.getStats(userId!),
  )

  const updateProfile = useCallback(
    async (input: UpdateUserProfileInput): Promise<UserProfile> => {
      if (!userId) {
        throw new Error('User ID is required to update profile')
      }

      const updated = await userRepository.update(userId, input)
      await mutateProfile(updated, { revalidate: false })
      return updated
    },
    [userId, mutateProfile],
  )

  return {
    profile: profile ?? null,
    stats: stats ?? null,
    isLoading: profileLoading || statsLoading,
    error: profileError ?? statsError,
    updateProfile,
  }
}
