'use client'

import useSWR from 'swr'
import { profileRepo } from '@/shared/di/container'
import { useAuth } from '@/presentation/providers/auth-provider'
import type { WrappedData, WrappedCategory } from '@/domain/entities/profile'

export function useWrapped(category: WrappedCategory) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data } = useSWR<WrappedData>(
    userId ? ['wrapped', userId, category] : null,
    ([, id, cat]: [string, string, WrappedCategory]) => profileRepo.getWrappedData(id, cat),
  )

  return { data }
}
