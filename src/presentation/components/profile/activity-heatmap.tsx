'use client'

import { Flame } from 'lucide-react'
import type { HeatmapCell, HeatmapStats } from '@/domain/entities/profile'

interface ActivityHeatmapProps {
  data: HeatmapCell[]
  stats?: HeatmapStats
}

const INTENSITY_COLORS: Record<HeatmapCell['intensity'], string> = {
  0: 'var(--bg-elevated)',
  1: 'color-mix(in srgb, var(--accent-social) 25%, transparent)',
  2: 'color-mix(in srgb, var(--accent-social) 50%, transparent)',
  3: 'color-mix(in srgb, var(--accent-social) 75%, transparent)',
  4: 'var(--accent-social)',
}

const DAY_LABELS = ['', '월', '', '수', '', '금', '']

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function getMonthLabels(): string[] {
  const labels: string[] = Array(13).fill('')
  const now = new Date()
  // 13 weeks = ~3 months. Show labels for recent 3 months at their approximate column
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const weeksAgo = Math.floor((now.getTime() - d.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const col = 12 - weeksAgo
    if (col >= 0 && col < 13) {
      labels[col] = MONTH_NAMES[d.getMonth()]
    }
  }
  return labels
}

export function ActivityHeatmap({ data, stats }: ActivityHeatmapProps) {
  // 13 weeks x 7 days grid
  const weeks = 13
  const grid: (HeatmapCell | null)[][] = Array.from({ length: weeks }, () =>
    Array.from<HeatmapCell | null>({ length: 7 }).fill(null),
  )

  // Fill grid from data (most recent = rightmost column)
  const totalCells = weeks * 7
  const startIdx = Math.max(0, totalCells - data.length)

  for (let i = 0; i < data.length && startIdx + i < totalCells; i++) {
    const cellIdx = startIdx + i
    const col = Math.floor(cellIdx / 7)
    const row = cellIdx % 7
    if (col < weeks) {
      grid[col][row] = data[i]
    }
  }

  return (
    <div
      className="card mx-4 rounded-2xl px-4 py-4"
    >
      <p className="mb-3" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
        활동 기록
      </p>

      {/* 상단 통계 3개 */}
      {stats && (
        <div className="mb-3 flex gap-3">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>{stats.totalRecords}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>총 기록</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame size={14} style={{ color: 'var(--caution)' }} />
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--caution)' }}>{stats.currentStreak}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>연속일</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>{stats.activePeriodMonths}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>개월</span>
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        {/* Day labels */}
        <div className="flex flex-col justify-between py-[1px]" style={{ width: '16px' }}>
          {DAY_LABELS.map((label, i) => (
            <span key={i} style={{ fontSize: '9px', color: 'var(--text-hint)', lineHeight: 1 }}>
              {label}
            </span>
          ))}
        </div>

        {/* Heatmap grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: '3px' }}>
          {grid.map((week, colIdx) =>
            week.map((cell, rowIdx) => (
              <div
                key={`${colIdx}-${rowIdx}`}
                style={{
                  aspectRatio: '1',
                  borderRadius: '3px',
                  backgroundColor: cell ? INTENSITY_COLORS[cell.intensity] : INTENSITY_COLORS[0],
                  gridColumn: colIdx + 1,
                  gridRow: rowIdx + 1,
                }}
                title={cell?.date ?? ''}
              />
            )),
          )}
        </div>
      </div>

      {/* Month labels */}
      <div className="mt-1 flex" style={{ paddingLeft: '20px' }}>
        <div className="flex flex-1 justify-between">
          {getMonthLabels().map((label, i) => (
            <span key={i} style={{ fontSize: '9px', color: 'var(--text-hint)', width: `${100 / 13}%`, textAlign: 'center' }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1">
        <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>Less</span>
        {([0, 1, 2, 3, 4] as const).map((intensity) => (
          <div
            key={intensity}
            className="h-[10px] w-[10px] rounded-[2px]"
            style={{ backgroundColor: INTENSITY_COLORS[intensity] }}
          />
        ))}
        <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>More</span>
      </div>
    </div>
  )
}
