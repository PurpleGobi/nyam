'use client'

import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarDayRecord } from '@/application/hooks/use-calendar-records'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

const RECORD_TYPE_STYLES: Record<string, { bg: string; emoji: string }> = {
  restaurant: { bg: 'bg-gradient-to-br from-amber-50 to-orange-100', emoji: '🍽️' },
  wine: { bg: 'bg-gradient-to-br from-purple-50 to-rose-100', emoji: '🍷' },
  cooking: { bg: 'bg-gradient-to-br from-green-50 to-emerald-100', emoji: '🍳' },
}

export function PhotoCalendar({
  year,
  month,
  recordsByDay,
  summary,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  onDayClick,
}: {
  year: number
  month: number
  recordsByDay: Map<number, CalendarDayRecord[]>
  summary: { recordCount: number; placeCount: number; avgRating: number }
  onPrevMonth: () => void
  onNextMonth: () => void
  onGoToday: () => void
  onDayClick?: (day: number, records: CalendarDayRecord[]) => void
}) {
  const totalDays = getDaysInMonth(year, month)
  const firstDayOffset = getFirstDayOfMonth(year, month)

  const today = new Date()
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month
  const todayDate = today.getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) {
    cells.push(null)
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push(d)
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
      {/* Month nav header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="rounded-full p-1 text-[var(--color-neutral-500)] transition-colors hover:bg-[var(--color-neutral-100)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onGoToday}
          className="text-sm font-semibold text-[var(--color-neutral-800)] hover:text-[#FF6038] transition-colors"
        >
          {year}년 {month}월
        </button>
        <button
          type="button"
          onClick={onNextMonth}
          className="rounded-full p-1 text-[var(--color-neutral-500)] transition-colors hover:bg-[var(--color-neutral-100)]"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-medium text-[var(--color-neutral-400)]"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />
          }

          const records = recordsByDay.get(day)
          const hasRecords = records && records.length > 0
          const isToday = isCurrentMonth && day === todayDate
          const photos = records
            ?.map((r) => r.photoUrl)
            .filter((url): url is string => url !== null)
          const hasPhotos = photos && photos.length > 0
          const hasMultiplePhotos = photos && photos.length >= 2

          // For records without photos, use type-based visual
          const primaryRecord = records?.[0]
          const typeStyle = primaryRecord
            ? RECORD_TYPE_STYLES[primaryRecord.recordType] ?? RECORD_TYPE_STYLES.restaurant
            : null

          return (
            <div
              key={day}
              role={hasRecords ? 'button' : undefined}
              tabIndex={hasRecords ? 0 : undefined}
              onClick={hasRecords && records ? () => onDayClick?.(day, records) : undefined}
              onKeyDown={hasRecords && records ? (e) => { if (e.key === 'Enter') onDayClick?.(day, records) } : undefined}
              className={`relative aspect-square overflow-hidden rounded-lg ${
                isToday ? 'ring-2 ring-[#FF6038]' : ''
              } ${hasRecords ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
            >
              {hasPhotos ? (
                hasMultiplePhotos ? (
                  <div className="grid h-full w-full grid-cols-2 gap-px">
                    <div className="relative overflow-hidden">
                      <Image src={photos[0]} alt="" fill sizes="50px" className="object-cover" />
                    </div>
                    <div className="relative overflow-hidden">
                      <Image src={photos[1]} alt="" fill sizes="50px" className="object-cover" />
                    </div>
                  </div>
                ) : (
                  <Image
                    src={photos[0]}
                    alt=""
                    fill
                    sizes="50px"
                    className="object-cover"
                  />
                )
              ) : hasRecords && typeStyle ? (
                <div className={`flex h-full w-full flex-col items-center justify-center ${typeStyle.bg}`}>
                  <span className="text-sm leading-none">{typeStyle.emoji}</span>
                  {records.length >= 2 && (
                    <span className="mt-0.5 text-[7px] font-bold text-[var(--color-neutral-500)]">
                      +{records.length}
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-full w-full bg-[var(--color-neutral-50)]" />
              )}

              {/* Day number overlay */}
              <span
                className={
                  hasPhotos
                    ? 'absolute left-0.5 top-0 text-[9px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
                    : hasRecords
                      ? 'absolute left-0.5 top-0 text-[9px] font-semibold text-[var(--color-neutral-600)]'
                      : 'absolute left-0.5 top-0 text-[9px] font-medium text-[var(--color-neutral-300)]'
                }
              >
                {day}
              </span>

              {/* Today indicator removed — using ring-2 border instead */}
            </div>
          )
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-3 border-t border-[var(--color-neutral-100)] pt-2 text-center text-xs text-[var(--color-neutral-500)]">
        {summary.recordCount}회 기록 · {summary.placeCount}곳 방문 · 평균{' '}
        {summary.avgRating.toFixed(1)}
      </div>
    </div>
  )
}
