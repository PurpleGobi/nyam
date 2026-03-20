"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/shared/utils/cn"
import type { RecordWithPhotos } from "@/domain/entities/record"

interface PhotoCalendarProps {
  recordsByDay: Record<number, RecordWithPhotos[]>
  year: number
  month: number
  onMonthChange: (year: number, month: number) => void
  totalRecords: number
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

export function PhotoCalendar({
  recordsByDay,
  year,
  month,
  onMonthChange,
  totalRecords,
}: PhotoCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  const handlePrevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12)
    else onMonthChange(year, month - 1)
  }

  const handleNextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1)
    else onMonthChange(year, month + 1)
  }

  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={handlePrevMonth} className="p-1 text-neutral-400 hover:text-neutral-600">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-neutral-800">
            {year}년 {month}월
          </p>
          <p className="text-[10px] text-neutral-400">{totalRecords}개 기록</p>
        </div>
        <button type="button" onClick={handleNextMonth} className="p-1 text-neutral-400 hover:text-neutral-600">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-medium text-neutral-400 pb-1">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const records = recordsByDay[day]
          const hasRecords = records && records.length > 0
          const firstPhoto = records?.[0]?.photos?.[0]
          const isToday = isCurrentMonth && today.getDate() === day

          return (
            <button
              key={day}
              type="button"
              onClick={() => hasRecords ? setSelectedDay(day === selectedDay ? null : day) : undefined}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden",
                hasRecords ? "cursor-pointer" : "cursor-default",
                isToday && !hasRecords && "ring-1 ring-primary-500",
              )}
            >
              {firstPhoto ? (
                <Image
                  src={firstPhoto.thumbnailUrl ?? firstPhoto.photoUrl}
                  alt={`${month}/${day}`}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className={cn(
                  "h-full w-full flex items-center justify-center text-[10px]",
                  isToday ? "bg-primary-50 text-primary-500 font-semibold" : "bg-neutral-50 text-neutral-400",
                )}>
                  {day}
                </div>
              )}

              {records && records.length > 1 && (
                <span className="absolute bottom-0.5 right-0.5 text-[8px] font-medium text-white bg-black/50 rounded-full px-1">
                  {records.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selectedDay && recordsByDay[selectedDay] && (
        <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3">
          {recordsByDay[selectedDay].map((record) => (
            <div key={record.id} className="flex items-center gap-2 text-sm">
              {record.photos[0] && (
                <div className="relative h-8 w-8 rounded-lg overflow-hidden shrink-0">
                  <Image src={record.photos[0].photoUrl} alt="" fill className="object-cover" sizes="32px" />
                </div>
              )}
              <span className="text-neutral-700 truncate">{record.menuName ?? record.restaurant?.name ?? "기록"}</span>
              {record.ratingOverall != null && (
                <span className="text-xs font-bold text-primary-500 ml-auto">{Math.round(record.ratingOverall)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
