'use client'

import useSWR from 'swr'
import { getTasteDnaRepository } from '@/di/repositories'

export function useTasteDna(userId: string | undefined) {
  const repo = getTasteDnaRepository()

  return useSWR(
    userId ? ['taste-dna', userId] : null,
    () => repo.getByUserId(userId!),
  )
}
