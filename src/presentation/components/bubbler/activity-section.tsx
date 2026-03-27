'use client'

import type { HeatmapCell } from '@/domain/entities/profile'

interface ActivitySectionProps {
  heatmap: HeatmapCell[]
}

const INTENSITY_COLORS: Record<number, string> = {
  0: 'var(--border)',
  1: 'var(--accent-food-light)',
  2: 'var(--accent-food)',
  3: 'var(--accent-food-dark, var(--accent-food))',
  4: 'var(--accent-food-darker, var(--accent-food))',
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const WEEKS = 13

export function ActivitySection({ heatmap }: ActivitySectionProps) {
  const cellMap = new Map(heatmap.map((c) => [c.date, c.intensity]))

  const today = new Date()
  const grid: { date: string; intensity: 0 | 1 | 2 | 3 | 4 }[][] = []

  for (let w = WEEKS - 1; w >= 0; w--) {
    const week: { date: string; intensity: 0 | 1 | 2 | 3 | 4 }[] = []
    for (let d = 0; d < 7; d++) {
      const offset = w * 7 + (6 - d)
      const date = new Date(today)
      date.setDate(today.getDate() - offset)
      const key = date.toISOString().slice(0, 10)
      week.push({ date: key, intensity: cellMap.get(key) ?? 0 })
    }
    grid.push(week)
  }

  const totalRecords = heatmap.reduce((sum, c) => sum + c.intensity, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>활동</h3>
        <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
          최근 13주 · {totalRecords}건
        </span>
      </div>

      <div className="flex gap-0.5 overflow-x-auto">
        <div className="mr-1 flex flex-col gap-0.5">
          {DAYS.map((day) => (
            <div key={day} className="flex h-[12px] items-center">
              <span className="text-[8px]" style={{ color: 'var(--text-hint)' }}>{day}</span>
            </div>
          ))}
        </div>
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((cell) => (
              <div
                key={cell.date}
                className="h-[12px] w-[12px] rounded-[2px]"
                style={{ backgroundColor: INTENSITY_COLORS[cell.intensity] ?? INTENSITY_COLORS[0] }}
                title={`${cell.date}: ${cell.intensity}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
