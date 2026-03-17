'use client'

import useSWR from 'swr'
import { getTasteDnaRepository } from '@/di/repositories'

export function useTasteDnaWine(userId: string | undefined) {
  const repo = getTasteDnaRepository()

  return useSWR(
    userId ? ['taste-dna-wine', userId] : null,
    () => repo.getWineByUserId(userId!),
  )
}
