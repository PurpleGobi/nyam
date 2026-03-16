'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { getRecordRepository } from '@/di/repositories'

interface CalendarDayRecord {
  photoUrl: string | null
}

interface CalendarSummary {
  recordCount: number
  placeCount: number
  avgRating: number
}

export function useCalendarRecords(
  userId: string | undefined,
  year: number,
  month: number,
) {
  const repo = getRecordRepository()

  const { data: records, isLoading, error } = useSWR(
    userId ? ['calendar-records', userId, year, month] : null,
    () => repo.getByUserIdForMonth(userId!, year, month),
  )

  const recordsByDay = useMemo(() => {
    const map = new Map<number, CalendarDayRecord[]>()
    if (!records) return map

    for (const record of records) {
      const day = new Date(record.createdAt).getDate()
      const existing = map.get(day) ?? []
      existing.push({ photoUrl: null })
      map.set(day, existing)
    }

    return map
  }, [records])

  const summary = useMemo<CalendarSummary>(() => {
    if (!records || records.length === 0) {
      return { recordCount: 0, placeCount: 0, avgRating: 0 }
    }

    const uniqueNames = new Set(records.map((r) => r.menuName))
    const totalRating = records.reduce((sum, r) => sum + r.ratingOverall, 0)

    return {
      recordCount: records.length,
      placeCount: uniqueNames.size,
      avgRating: Math.round((totalRating / records.length) * 10) / 10,
    }
  }, [records])

  return {
    recordsByDay,
    summary,
    isLoading,
    error,
  }
}
