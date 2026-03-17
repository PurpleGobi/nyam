'use client'

import useSWR from 'swr'
import { getRecordRepository } from '@/di/repositories'

export function useRecords(userId: string | undefined, limit = 20, offset = 0) {
  const repo = getRecordRepository()

  return useSWR(
    userId ? ['records', userId, limit, offset] : null,
    () => repo.getByUserId(userId!, { limit, offset }),
  )
}
