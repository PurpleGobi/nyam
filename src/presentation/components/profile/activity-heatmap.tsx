'use client'

import type { HeatmapCell } from '@/domain/entities/profile'

interface ActivityHeatmapProps {
  data: HeatmapCell[]
}

const INTENSITY_COLORS: Record<HeatmapCell['intensity'], string> = {
  0: 'var(--bg-elevated)',
  1: 'color-mix(in srgb, var(--accent-food) 25%, transparent)',
  2: 'color-mix(in srgb, var(--accent-food) 50%, transparent)',
  3: 'color-mix(in srgb, var(--accent-food) 75%, transparent)',
  4: 'var(--accent-food)',
}

const DAY_LABELS = ['', '월', '', '수', '', '금', '']

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
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
      className="mx-4 rounded-2xl px-4 py-4"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <p className="mb-3" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
        활동 기록
      </p>

      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] pr-1">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="flex h-[12px] w-[12px] items-center justify-center"
            >
              <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex flex-1 justify-between">
          {grid.map((week, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-[3px]">
              {week.map((cell, rowIdx) => (
                <div
                  key={rowIdx}
                  className="h-[12px] w-[12px] rounded-[2px]"
                  style={{
                    backgroundColor: cell ? INTENSITY_COLORS[cell.intensity] : INTENSITY_COLORS[0],
                  }}
                  title={cell?.date ?? ''}
                />
              ))}
            </div>
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
