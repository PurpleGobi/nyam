'use client'

import { cn } from '@/shared/utils/cn'
import type { TasteDna } from '@/domain/entities/taste-dna'

interface TasteDnaRadarProps {
  tasteDna: Partial<TasteDna>
  size?: number
  className?: string
}

const AXES = [
  { key: 'flavorSpicy' as const, label: '매운맛' },
  { key: 'flavorSweet' as const, label: '단맛' },
  { key: 'flavorSalty' as const, label: '짠맛' },
  { key: 'flavorSour' as const, label: '신맛' },
  { key: 'flavorUmami' as const, label: '감칠맛' },
  { key: 'flavorRich' as const, label: '리치' },
]

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleIndex: number,
  total: number,
): [number, number] {
  const angle = (Math.PI * 2 * angleIndex) / total - Math.PI / 2
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
}

function buildPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  values: number[],
): string {
  return values
    .map((v, i) => {
      const [x, y] = polarToCartesian(cx, cy, radius * v, i, values.length)
      return `${x},${y}`
    })
    .join(' ')
}

function buildHexagonPoints(cx: number, cy: number, radius: number): string {
  return Array.from({ length: 6 })
    .map((_, i) => {
      const [x, y] = polarToCartesian(cx, cy, radius, i, 6)
      return `${x},${y}`
    })
    .join(' ')
}

export function TasteDnaRadar({
  tasteDna,
  size = 200,
  className,
}: TasteDnaRadarProps) {
  const cx = 50
  const cy = 50
  const radius = 36
  const labelRadius = 46

  const values = AXES.map((a) => {
    const v = tasteDna[a.key]
    return typeof v === 'number' ? Math.max(0, Math.min(1, v)) : 0
  })

  const isEmpty = values.every((v) => v === 0)

  return (
    <div className={cn('inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="overflow-visible"
      >
        {/* Guide rings at 33% and 66% */}
        <polygon
          points={buildHexagonPoints(cx, cy, radius * 0.33)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="0.3"
        />
        <polygon
          points={buildHexagonPoints(cx, cy, radius * 0.66)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="0.3"
        />

        {/* Outer hexagon */}
        <polygon
          points={buildHexagonPoints(cx, cy, radius)}
          fill="none"
          stroke="#d1d5db"
          strokeWidth="0.5"
        />

        {/* Axis lines */}
        {AXES.map((_, i) => {
          const [x, y] = polarToCartesian(cx, cy, radius, i, 6)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="0.3"
            />
          )
        })}

        {/* Data polygon or empty state */}
        {isEmpty ? (
          <polygon
            points={buildHexagonPoints(cx, cy, radius * 0.5)}
            fill="none"
            stroke="#d1d5db"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        ) : (
          <polygon
            points={buildPolygonPoints(cx, cy, radius, values)}
            fill="rgba(255, 96, 56, 0.2)"
            stroke="#FF6038"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {!isEmpty &&
          values.map((v, i) => {
            if (v === 0) return null
            const [x, y] = polarToCartesian(cx, cy, radius * v, i, 6)
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.2"
                fill="#FF6038"
              />
            )
          })}

        {/* Axis labels */}
        {AXES.map((axis, i) => {
          const [x, y] = polarToCartesian(cx, cy, labelRadius, i, 6)
          return (
            <text
              key={axis.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-neutral-500"
              fontSize="3.5"
              fontWeight="500"
            >
              {axis.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
