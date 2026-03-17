"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import { getRecordRepository } from "@/di/repositories"
import type { RecordWithPhotos } from "@/domain/entities/record"
import type { RecordType } from "@/infrastructure/supabase/types"

export interface RecordListFilters {
  recordType?: RecordType
  fromDate?: string
  toDate?: string
  genre?: string
  limit?: number
  offset?: number
}

export function useRecords(filters: RecordListFilters = {}) {
  const supabase = createClient()
  const repo = getRecordRepository()

  const filterKey = JSON.stringify(filters)

  const { data, error, isLoading, mutate } = useSWR<RecordWithPhotos[]>(
    `records/${filterKey}`,
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      return repo.list({
        userId: user.id,
        recordType: filters.recordType,
        genre: filters.genre,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        limit: filters.limit ?? 20,
        offset: filters.offset,
      })
    },
  )

  return {
    records: data ?? [],
    isLoading,
    error: error ? String(error) : null,
    mutate,
  }
}
