'use client'

import useSWR from 'swr'
import { getRecordRepository } from '@/di/repositories'

export function useDiscover(query: string) {
  const repo = getRecordRepository()

  return useSWR(
    query.trim() ? ['discover', query] : null,
    () => repo.search(query),
  )
}
