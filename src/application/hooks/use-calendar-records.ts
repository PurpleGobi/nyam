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
      const targetType: RecordTargetType = tab
      const records = await recordRepo.findByUserIdWithTarget(userId, targetType)

      const monthStr = `${year}-${String(month).padStart(2, '0')}`
      const monthRecords = records.filter((r) => r.latestVisitDate?.startsWith(monthStr))

      const grouped = new Map<string, { topScore: number | null; recordCount: number; photoUrl: string | null }>()
      for (const r of monthRecords) {
        if (!r.latestVisitDate) continue
        const date = r.latestVisitDate.slice(0, 10)
        const existing = grouped.get(date)
        if (existing) {
          existing.recordCount += 1
          if (r.avgSatisfaction != null && (existing.topScore == null || r.avgSatisfaction > existing.topScore)) {
            existing.topScore = r.avgSatisfaction
          }
          // 첫 번째 사진이 있는 기록의 사진을 대표 사진으로 사용
          if (!existing.photoUrl && r.targetPhotoUrl) {
            existing.photoUrl = r.targetPhotoUrl
          }
        } else {
          grouped.set(date, {
            topScore: r.avgSatisfaction,
            recordCount: 1,
            photoUrl: r.targetPhotoUrl,
          })
        }
      }

      const result: CalendarDayData[] = Array.from(grouped.entries()).map(([date, data]) => ({
        date,
        photoUrl: data.photoUrl,
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
