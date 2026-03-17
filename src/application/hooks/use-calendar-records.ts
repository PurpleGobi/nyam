"use client"

import useSWR from "swr"
import { getRecordRepository } from "@/di/repositories"
import type { RecordWithPhotos } from "@/domain/entities/record"

export function useCalendarRecords(userId: string | null, year: number, month: number) {
  const { data, error, isLoading } = useSWR<RecordWithPhotos[]>(
    userId ? `calendar-${userId}-${year}-${month}` : null,
    () => {
      if (!userId) return []
      return getRecordRepository().getByMonth(userId, year, month)
    },
  )

  // Group by day
  const recordsByDay = (data ?? []).reduce<Record<number, RecordWithPhotos[]>>((acc, record) => {
    const day = new Date(record.createdAt).getDate()
    if (!acc[day]) acc[day] = []
    acc[day].push(record)
    return acc
  }, {})

  return {
    records: data ?? [],
    recordsByDay,
    isLoading,
    error: error ? String(error) : null,
  }
}
