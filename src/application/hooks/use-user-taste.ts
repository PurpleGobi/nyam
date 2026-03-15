'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import type { UserTasteProfile, DiningExperience } from '@/domain/entities/user-taste'
import type {
  CreateDiningExperienceInput,
  UpdateTasteProfileInput,
} from '@/domain/repositories/user-taste-repository'
import { supabaseUserTasteRepository } from '@/infrastructure/repositories/supabase-user-taste-repository'
import { useAuth } from './use-auth'

interface UseUserTasteReturn {
  readonly tasteProfile: UserTasteProfile | null
  readonly experiences: readonly DiningExperience[]
  readonly isLoading: boolean
  readonly error: Error | undefined
  readonly updateTasteProfile: (input: UpdateTasteProfileInput) => Promise<UserTasteProfile>
  readonly addExperience: (input: Omit<CreateDiningExperienceInput, 'userId'>) => Promise<DiningExperience>
}

/**
 * Hook for managing user taste profiles and dining experiences.
 */
export function useUserTaste(): UseUserTasteReturn {
  const { user } = useAuth()

  const {
    data: tasteProfile,
    error: tasteError,
    isLoading: tasteLoading,
    mutate: mutateTaste,
  } = useSWR(
    user ? ['taste-profile', user.id] : null,
    () => supabaseUserTasteRepository.getTasteProfile(user!.id),
  )

  const {
    data: experiences,
    error: expError,
    isLoading: expLoading,
    mutate: mutateExp,
  } = useSWR(
    user ? ['dining-experiences', user.id] : null,
    () => supabaseUserTasteRepository.getDiningExperiences(user!.id, 10),
  )

  const updateTasteProfile = useCallback(
    async (input: UpdateTasteProfileInput): Promise<UserTasteProfile> => {
      if (!user) throw new Error('Must be authenticated')
      const updated = await supabaseUserTasteRepository.updateTasteProfile(user.id, input)
      await mutateTaste(updated, { revalidate: false })
      return updated
    },
    [user, mutateTaste],
  )

  const addExperience = useCallback(
    async (input: Omit<CreateDiningExperienceInput, 'userId'>): Promise<DiningExperience> => {
      if (!user) throw new Error('Must be authenticated')
      const created = await supabaseUserTasteRepository.addDiningExperience({
        ...input,
        userId: user.id,
      })
      await mutateExp()
      return created
    },
    [user, mutateExp],
  )

  return {
    tasteProfile: tasteProfile ?? null,
    experiences: experiences ?? [],
    isLoading: tasteLoading || expLoading,
    error: tasteError ?? expError,
    updateTasteProfile,
    addExperience,
  }
}
