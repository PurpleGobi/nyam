'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface CalendarDayData {
  date: string
  photoUrl: string | null
  topScore: number | null
  recordCount: number
}

interface CalendarViewProps {
  year: number
  month: number
  records: CalendarDayData[]
  onMonthChange: (year: number, month: number) => void
  onDaySelect: (date: string) => void
  selectedDate: string | null
  accentType: 'restaurant' | 'wine'
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getTodayString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function CalendarView({
  year,
  month,
  records,
  onMonthChange,
  onDaySelect,
  selectedDate,
  accentType,
}: CalendarViewProps) {
  const accentColor = accentType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'
  const today = getTodayString()

  const prevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12)
    else onMonthChange(year, month - 1)
  }
  const nextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1)
    else onMonthChange(year, month + 1)
  }

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const recordMap = new Map<string, CalendarDayData>()
  for (const r of records) {
    recordMap.set(r.date, r)
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ padding: '0 16px' }}>
      <div className="flex items-center justify-between" style={{ padding: '12px 0' }}>
        <button type="button" onClick={prevMonth} className="p-1" style={{ color: 'var(--text-sub)' }}>
          <ChevronLeft size={20} />
        </button>
        <span className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>
          {year}년 {month}월
        </span>
        <button type="button" onClick={nextMonth} className="p-1" style={{ color: 'var(--text-sub)' }}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[3px]">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-[11px] font-medium"
            style={{ color: 'var(--text-hint)', paddingBottom: '4px' }}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-[3px]">
        {cells.map((day, idx) => {
          if (day == null) {
            return <div key={`empty-${idx}`} className="aspect-square" />
          }

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const data = recordMap.get(dateStr)
          const isToday = dateStr === today
          const isSelected = selectedDate != null && dateStr === selectedDate

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => data && data.recordCount > 0 ? onDaySelect(dateStr) : undefined}
              className="relative aspect-square overflow-hidden rounded-lg"
              style={{
                cursor: data && data.recordCount > 0 ? 'pointer' : 'default',
                backgroundImage: data?.photoUrl ? `url(${data.photoUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: isSelected ? 'var(--accent-food-light)' : undefined,
                boxShadow: isToday ? `0 0 0 2px ${accentColor}` : undefined,
              }}
            >
              {data?.photoUrl && (
                <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} />
              )}

              <span
                className="absolute left-1 top-0.5 z-[1] text-[11px] font-semibold"
                style={{
                  color: data?.photoUrl ? '#fff' : 'var(--text-sub)',
                  textShadow: data?.photoUrl ? '0 1px 2px rgba(0,0,0,0.5)' : undefined,
                }}
              >
                {day}
              </span>

              {data && data.recordCount > 1 && (
                <span
                  className="absolute right-[3px] top-0.5 z-[1] rounded-full text-[10px] font-extrabold text-white"
                  style={{ padding: '1px 4px', backgroundColor: accentColor }}
                >
                  {data.recordCount}
                </span>
              )}

              {data?.topScore != null && (
                <span className="absolute bottom-0.5 right-1 z-[1] text-[12px] font-bold text-white">
                  {data.topScore}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
