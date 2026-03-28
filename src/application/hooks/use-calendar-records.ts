'use client'

import { useState, useEffect, useCallback } from 'react'
import type { HomeTab } from '@/domain/entities/home-state'
import type { RecordTargetType } from '@/domain/entities/record'
import type { CalendarDayData } from '@/presentation/components/home/calendar-view'
import { recordRepo } from '@/shared/di/container'

export function useCalendarRecords(params: {
  userId: string | null
  tab: HomeTab
  year: number
  month: number
}): {
  days: CalendarDayData[]
  isLoading: boolean
} {
  const { userId, tab, year, month } = params
  const [days, setDays] = useState<CalendarDayData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCalendar = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const targetType: RecordTargetType = tab === 'following' ? 'restaurant' : tab
      const records = await recordRepo.findByUserId(userId, targetType)

      const monthStr = `${year}-${String(month).padStart(2, '0')}`
      const monthRecords = records.filter((r) => r.visitDate?.startsWith(monthStr))

      const grouped = new Map<string, { topScore: number | null; recordCount: number }>()
      for (const r of monthRecords) {
        if (!r.visitDate) continue
        const date = r.visitDate.slice(0, 10)
        const existing = grouped.get(date)
        if (existing) {
          existing.recordCount += 1
          if (r.satisfaction != null && (existing.topScore == null || r.satisfaction > existing.topScore)) {
            existing.topScore = r.satisfaction
          }
        } else {
          grouped.set(date, {
            topScore: r.satisfaction,
            recordCount: 1,
          })
        }
      }

      const result: CalendarDayData[] = Array.from(grouped.entries()).map(([date, data]) => ({
        date,
        photoUrl: null,
        topScore: data.topScore,
        recordCount: data.recordCount,
      }))

      setDays(result)
    } catch {
      setDays([])
    } finally {
      setIsLoading(false)
    }
  }, [userId, tab, year, month])

  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar])

  return { days, isLoading }
}
