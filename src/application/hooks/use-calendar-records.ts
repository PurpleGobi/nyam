'use client'

import { useMemo } from 'react'
import type { RecordWithTarget } from '@/domain/entities/record'
import type { CalendarDayData } from '@/domain/entities/calendar'

export function useCalendarRecords(params: {
  records: RecordWithTarget[]
  year: number
  month: number
}): {
  days: CalendarDayData[]
} {
  const { records, year, month } = params

  const days = useMemo(() => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const monthRecords = records.filter((r) => r.visitDate?.startsWith(monthStr))

    const grouped = new Map<string, { topScore: number | null; recordCount: number; photoUrl: string | null }>()
    for (const r of monthRecords) {
      if (!r.visitDate) continue
      const date = r.visitDate.slice(0, 10)
      const existing = grouped.get(date)
      if (existing) {
        existing.recordCount += 1
        if (r.satisfaction != null && (existing.topScore == null || r.satisfaction > existing.topScore)) {
          existing.topScore = r.satisfaction
        }
        if (!existing.photoUrl && r.targetPhotoUrl) {
          existing.photoUrl = r.targetPhotoUrl
        }
      } else {
        grouped.set(date, {
          topScore: r.satisfaction,
          recordCount: 1,
          photoUrl: r.targetPhotoUrl,
        })
      }
    }

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      photoUrl: data.photoUrl,
      topScore: data.topScore,
      recordCount: data.recordCount,
    }))
  }, [records, year, month])

  return { days }
}
