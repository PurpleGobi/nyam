'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import type { CalendarDayRecord } from '@/application/hooks/use-calendar-records'

const TYPE_EMOJI: Record<string, string> = {
  restaurant: '🍽️',
  wine: '🍷',
  cooking: '🍳',
}

export function CalendarDayPopup({
  day,
  month,
  records,
  onSelect,
  onClose,
}: {
  day: number
  month: number
  records: CalendarDayRecord[]
  onSelect: (recordId: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[2px]">
      <div
        ref={ref}
        className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-200 rounded-t-2xl bg-white px-4 pb-6 pt-3 shadow-lg"
      >
        {/* Handle bar */}
        <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-[var(--color-neutral-200)]" />

        {/* Date header */}
        <div className="mb-3 text-sm font-semibold text-[var(--color-neutral-800)]">
          {month}월 {day}일 기록
          <span className="ml-1.5 text-xs font-normal text-[var(--color-neutral-400)]">
            {records.length}건
          </span>
        </div>

        {/* Records list */}
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {records.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
              className="flex items-center gap-3 rounded-xl bg-[var(--color-neutral-50)] p-3 text-left transition-colors hover:bg-[var(--color-neutral-100)] active:bg-[var(--color-neutral-200)]"
            >
              {/* Thumbnail or emoji */}
              {record.photoUrl ? (
                <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={record.photoUrl}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-neutral-100)]">
                  <span className="text-lg">{TYPE_EMOJI[record.recordType] ?? '🍽️'}</span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-semibold text-[var(--color-neutral-800)]">
                  {record.menuName || '기록'}
                </div>
                <div className="text-xs text-[var(--color-neutral-400)]">
                  {record.recordType === 'wine' ? '와인' : record.recordType === 'cooking' ? '요리' : '식당'}
                </div>
              </div>

              {/* Rating */}
              <div className="flex-shrink-0 text-right">
                <div className="text-sm font-bold text-[var(--color-primary-500)]">
                  {record.rating}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
