'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { getRecordRepository } from '@/di/repositories'
import type { RecordPhoto, PhotoType } from '@/domain/entities/record'

interface CalendarDayRecord {
  photoUrl: string | null
}

interface CalendarSummary {
  recordCount: number
  placeCount: number
  avgRating: number
}

// Prefer signboard/companion photos over food for calendar thumbnails
const PHOTO_PRIORITY: PhotoType[] = ['signboard', 'companion', 'food', 'menu', 'other', 'receipt']

function pickBestPhoto(photos: RecordPhoto[] | undefined): string | null {
  if (!photos || photos.length === 0) return null

  for (const type of PHOTO_PRIORITY) {
    const match = photos.find((p) => p.photoType === type)
    if (match) return match.thumbnailUrl || match.photoUrl
  }

  // Fallback: first photo
  return photos[0].thumbnailUrl || photos[0].photoUrl
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
      // Extract best photo from record's photos array
      const photos = (record as unknown as { photos?: RecordPhoto[] }).photos
      existing.push({ photoUrl: pickBestPhoto(photos) })
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
