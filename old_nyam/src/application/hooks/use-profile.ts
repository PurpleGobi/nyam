'use client'

import useSWR from 'swr'
import { getUserRepository } from '@/di/repositories'

export function useProfile(userId: string | undefined) {
  const repo = getUserRepository()

  const { data: userData, isLoading: userLoading, error: userError, mutate: mutateUser } = useSWR(
    userId ? ['user', userId] : null,
    () => repo.getById(userId!),
  )

  const { data: statsData, isLoading: statsLoading, error: statsError } = useSWR(
    userId ? ['user-stats', userId] : null,
    () => repo.getStats(userId!),
  )

  return {
    user: userData,
    stats: statsData,
    isLoading: userLoading || statsLoading,
    error: userError || statsError,
    mutate: mutateUser,
  }
}
