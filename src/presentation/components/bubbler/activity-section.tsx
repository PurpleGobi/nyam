'use client'

import { Activity, Flame } from 'lucide-react'
import type { HeatmapCell } from '@/domain/entities/profile'

interface ActivitySectionProps {
  heatmap: HeatmapCell[]
  totalRecords?: number
  currentStreak?: number
  activeDuration?: string
}

const INTENSITY_COLORS: Record<number, string> = {
  0: 'var(--border)',
  1: 'rgba(122,155,174,0.25)',
  2: 'rgba(122,155,174,0.5)',
  3: 'rgba(122,155,174,0.8)',
  4: 'var(--accent-social)',
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const WEEKS = 13

export function ActivitySection({ heatmap, totalRecords, currentStreak, activeDuration }: ActivitySectionProps) {
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

  // 월 라벨 계산 (각 주의 첫 번째 날짜 기준으로 월이 바뀌면 표시)
  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  for (let wi = 0; wi < grid.length; wi++) {
    const firstDate = new Date(grid[wi][0].date)
    const m = firstDate.getMonth()
    if (m !== lastMonth) {
      monthLabels.push({ label: `${m + 1}월`, col: wi })
      lastMonth = m
    }
  }

  const heatmapTotal = totalRecords ?? heatmap.reduce((sum, c) => sum + c.intensity, 0)

  return (
    <div className="flex flex-col gap-3" style={{ padding: '16px 20px' }}>
      <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: 'var(--text)' }}>
        <Activity size={14} style={{ color: 'var(--text-sub)' }} />
        활동
      </div>

      {/* 3-chip 통계 */}
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col items-center rounded-xl py-2" style={{ backgroundColor: 'var(--bg-section)' }}>
          <span className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>{heatmapTotal}</span>
          <span className="text-[9px]" style={{ color: 'var(--text-sub)' }}>총 기록</span>
        </div>
        <div className="flex flex-1 flex-col items-center rounded-xl py-2" style={{ backgroundColor: 'var(--bg-section)' }}>
          <span className="text-[16px] font-bold" style={{ color: currentStreak && currentStreak > 0 ? 'var(--caution)' : 'var(--text)' }}>
            {currentStreak ?? 0}주
          </span>
          <span className="text-[9px]" style={{ color: 'var(--text-sub)' }}>연속 기록</span>
        </div>
        <div className="flex flex-1 flex-col items-center rounded-xl py-2" style={{ backgroundColor: 'var(--bg-section)' }}>
          <span className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>{activeDuration ?? '-'}</span>
          <span className="text-[9px]" style={{ color: 'var(--text-sub)' }}>활동 기간</span>
        </div>
      </div>

      {/* 히트맵 */}
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

      {/* 월 라벨 (목업 .hm-months) */}
      <div className="flex" style={{ paddingLeft: '20px' }}>
        {monthLabels.map((m, i) => {
          const nextCol = i < monthLabels.length - 1 ? monthLabels[i + 1].col : WEEKS
          const span = nextCol - m.col
          return (
            <span
              key={m.label + m.col}
              className="text-[9px]"
              style={{ color: 'var(--text-hint)', width: `${(span / WEEKS) * 100}%` }}
            >
              {m.label}
            </span>
          )
        })}
      </div>

      {/* 스트릭 배너 */}
      {currentStreak != null && currentStreak > 0 && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{
            background: 'linear-gradient(90deg, rgba(201,169,110,0.12), transparent)',
            borderLeft: '3px solid var(--caution)',
          }}
        >
          <Flame size={14} style={{ color: 'var(--caution)' }} />
          <span className="text-[12px]" style={{ color: 'var(--text)' }}>
            <strong style={{ color: 'var(--caution)' }}>{currentStreak}주</strong> 연속 기록 중!
          </span>
        </div>
      )}
    </div>
  )
}
