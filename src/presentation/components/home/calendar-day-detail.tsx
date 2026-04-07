'use client'

import { useRouter } from 'next/navigation'
import type { ScoreSource } from '@/domain/entities/score'
import { ScoreSourceBadge } from '@/presentation/components/home/score-source-badge'

interface CalendarDayDetailProps {
  date: string
  records: {
    mealTime: string
    name: string
    score: number | null
    id: string
    targetType: 'restaurant' | 'wine'
    targetId: string
    scoreSource?: ScoreSource
  }[]
  accentType: 'restaurant' | 'wine'
}

export function CalendarDayDetail({ date, records, accentType }: CalendarDayDetailProps) {
  const router = useRouter()
  const accentColor = accentType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div
      className="mx-4 mt-2 overflow-hidden rounded-2xl"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="px-4 py-3 text-[13px] font-bold"
        style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
      >
        {date} · {records.length}곳 방문
      </div>

      {records.map((record) => (
        <button
          key={record.id}
          type="button"
          onClick={() =>
            router.push(
              `/${record.targetType === 'restaurant' ? 'restaurants' : 'wines'}/${record.targetId}`,
            )
          }
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-transform active:scale-[0.985]"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span
            className="min-w-[32px] text-[12px] font-medium"
            style={{ color: 'var(--text-hint)' }}
          >
            {record.mealTime}
          </span>

          <span
            className="min-w-0 flex-1 truncate text-[14px] font-semibold"
            style={{ color: 'var(--text)' }}
          >
            {record.name}
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className="text-[16px] font-bold tabular-nums"
              style={{ color: record.score != null ? accentColor : 'var(--text-hint)' }}
            >
              {record.score ?? '—'}
            </span>
            {record.score != null && record.scoreSource && record.scoreSource !== 'mine' && (
              <ScoreSourceBadge source={record.scoreSource} />
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
