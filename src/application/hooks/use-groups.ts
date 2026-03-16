'use client'

import useSWR from 'swr'
import { getGroupRepository } from '@/di/repositories'

export function useGroups(userId: string | undefined) {
  const repo = getGroupRepository()

  return useSWR(
    userId ? ['groups', userId] : null,
    () => repo.getByUserId(userId!),
  )
}
