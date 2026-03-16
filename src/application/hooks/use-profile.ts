'use client'

import useSWR from 'swr'
import { getUserRepository } from '@/di/repositories'

export function useProfile(userId: string | undefined) {
  const repo = getUserRepository()

  const user = useSWR(
    userId ? ['user', userId] : null,
    () => repo.getById(userId!),
  )

  const stats = useSWR(
    userId ? ['user-stats', userId] : null,
    () => repo.getStats(userId!),
  )

  return {
    user: user.data,
    stats: stats.data,
    isLoading: user.isLoading || stats.isLoading,
    error: user.error || stats.error,
  }
}
