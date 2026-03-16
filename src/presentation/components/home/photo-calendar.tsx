'use client'

import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

export function PhotoCalendar({
  year,
  month,
  recordsByDay,
  summary,
  onPrevMonth,
  onNextMonth,
}: {
  year: number
  month: number
  recordsByDay: Map<number, { photoUrl: string | null }[]>
  summary: { recordCount: number; placeCount: number; avgRating: number }
  onPrevMonth: () => void
  onNextMonth: () => void
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
        <span className="text-sm font-semibold text-[var(--color-neutral-800)]">
          {year}년 {month}월
        </span>
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
          const hasMultiple = records && records.length >= 2
          const isToday = isCurrentMonth && day === todayDate
          const photos = records
            ?.map((r) => r.photoUrl)
            .filter((url): url is string => url !== null)

          return (
            <div
              key={day}
              className="relative aspect-square overflow-hidden rounded-lg"
            >
              {hasRecords && photos && photos.length > 0 ? (
                hasMultiple && photos.length >= 2 ? (
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
              ) : (
                <div className="h-full w-full bg-[var(--color-neutral-50)]" />
              )}

              {/* Day number overlay */}
              <span
                className={
                  hasRecords && photos && photos.length > 0
                    ? 'absolute left-0.5 top-0.5 text-[9px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
                    : 'absolute left-0.5 top-0.5 text-[9px] font-medium text-[var(--color-neutral-400)]'
                }
              >
                {day}
              </span>

              {/* Today indicator */}
              {isToday && (
                <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-primary-500)]" />
              )}
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
