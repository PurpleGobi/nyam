'use client'

import { useState } from 'react'

interface VarietalData {
  name: string
  nameKo: string
  count: number
  bodyOrder: number
}

interface VarietalChartProps {
  varieties: VarietalData[]
  onVarietyTap?: (name: string) => void
}

export function VarietalChart({ varieties, onVarietyTap }: VarietalChartProps) {
  const [showAll, setShowAll] = useState(false)

  const sorted = [...varieties].sort((a, b) => a.bodyOrder - b.bodyOrder)
  const maxCount = Math.max(...sorted.map((v) => v.count), 1)
  const displayed = showAll ? sorted : sorted.filter((v) => v.count > 0)

  return (
    <div className="flex flex-col gap-[6px]">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div />
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-[6px]"
          style={{ cursor: 'pointer' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
            마신 품종만
          </span>
          <div
            className="relative rounded-full"
            style={{
              width: 32,
              height: 18,
              backgroundColor: !showAll ? 'var(--accent-wine)' : 'var(--border)',
              transition: 'background 0.2s',
            }}
          >
            <div
              className="absolute top-[2px] rounded-full bg-elevated"
              style={{
                width: 14,
                height: 14,
                left: !showAll ? 16 : 2,
                transition: 'left 0.2s',
              }}
            />
          </div>
        </button>
      </div>

      {/* Variety rows */}
      {displayed.map((varietal) => {
        const widthPercent = varietal.count > 0 ? (varietal.count / maxCount) * 100 : 0
        const isEmpty = varietal.count === 0

        return (
          <div
            key={varietal.name}
            className="flex items-center gap-[8px]"
            style={{
              opacity: isEmpty ? 0.35 : 1,
              cursor: onVarietyTap && !isEmpty ? 'pointer' : undefined,
            }}
            onClick={() => !isEmpty && onVarietyTap?.(varietal.name)}
          >
            <div className="w-[78px] shrink-0 overflow-hidden text-right">
              <p
                className="truncate text-[12px]"
                style={{
                  fontWeight: 600,
                  color: isEmpty ? 'var(--text-hint)' : 'var(--text)',
                }}
              >
                {varietal.nameKo}
              </p>
            </div>
            <div
              className="relative h-[16px] flex-1 overflow-hidden rounded-[3px]"
              style={{ backgroundColor: 'var(--bg-page)' }}
            >
              {varietal.count > 0 && (
                <div
                  className="absolute inset-y-0 left-0 rounded-[3px]"
                  style={{
                    width: `${widthPercent}%`,
                    background:
                      'linear-gradient(90deg, rgba(139,115,150,0.5), var(--accent-wine))',
                  }}
                />
              )}
            </div>
            <span
              className="w-[40px] shrink-0 text-right text-[12px]"
              style={{
                fontWeight: isEmpty ? 400 : 800,
                color: isEmpty ? 'var(--text-hint)' : 'var(--accent-wine)',
              }}
            >
              {isEmpty ? '—' : varietal.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
