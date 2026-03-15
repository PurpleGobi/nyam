'use client'

import useSWR, { useSWRConfig } from 'swr'
import { useCallback } from 'react'
import type { Verification } from '@/domain/entities/verification'
import type { CreateVerificationInput } from '@/domain/repositories/verification-repository'
import { supabaseVerificationRepository } from '@/infrastructure/repositories/supabase-verification-repository'
import { useAuth } from './use-auth'

interface UseRestaurantVerificationsReturn {
  readonly verifications: readonly Verification[]
  readonly isLoading: boolean
  readonly error: Error | undefined
}

/**
 * Hook for fetching verifications for a specific restaurant.
 */
export function useRestaurantVerifications(
  restaurantId: string | undefined,
): UseRestaurantVerificationsReturn {
  const { data, error, isLoading } = useSWR<readonly Verification[]>(
    restaurantId ? ['verifications', 'restaurant', restaurantId] : null,
    () => supabaseVerificationRepository.findByRestaurant(restaurantId!),
  )

  return {
    verifications: data ?? [],
    isLoading,
    error,
  }
}

interface UseMyVerificationsReturn {
  readonly verifications: readonly Verification[]
  readonly isLoading: boolean
  readonly error: Error | undefined
}

/**
 * Hook for fetching current user's verifications.
 */
export function useMyVerifications(): UseMyVerificationsReturn {
  const { user } = useAuth()

  const { data, error, isLoading } = useSWR<readonly Verification[]>(
    user ? ['verifications', 'user', user.id] : null,
    () => supabaseVerificationRepository.findByUser(user!.id),
  )

  return {
    verifications: data ?? [],
    isLoading,
    error,
  }
}

interface UseSubmitVerificationReturn {
  readonly submitVerification: (
    input: Omit<CreateVerificationInput, 'userId'>,
  ) => Promise<Verification>
}

/**
 * Hook for submitting a new verification.
 * Mutates related SWR caches after successful creation.
 */
export function useSubmitVerification(): UseSubmitVerificationReturn {
  const { user } = useAuth()
  const { mutate } = useSWRConfig()

  const submitVerification = useCallback(
    async (input: Omit<CreateVerificationInput, 'userId'>): Promise<Verification> => {
      if (!user) {
        throw new Error('User must be authenticated to submit a verification')
      }

      const verification = await supabaseVerificationRepository.create({
        ...input,
        userId: user.id,
      })

      // Revalidate related caches
      await Promise.all([
        mutate(
          (key: unknown) =>
            Array.isArray(key) &&
            key[0] === 'verifications' &&
            key[1] === 'restaurant' &&
            key[2] === input.restaurantId,
        ),
        mutate(
          (key: unknown) =>
            Array.isArray(key) && key[0] === 'verifications' && key[1] === 'user',
        ),
        mutate(
          (key: unknown) =>
            Array.isArray(key) && key[0] === 'restaurant' && key[1] === input.restaurantId,
        ),
      ])

      return verification
    },
    [user, mutate],
  )

  return { submitVerification }
}
