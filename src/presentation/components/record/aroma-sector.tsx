'use client'

import type { AromaSectorMeta } from '@/domain/entities/aroma'

interface AromaSectorProps {
  sector: AromaSectorMeta
  pathData: string
  labelPosition: { x: number; y: number }
  isActive: boolean
  onPointerDown: () => void
  onPointerEnter: () => void
}

export function AromaSector({
  sector,
  pathData,
  labelPosition,
  isActive,
  onPointerDown,
  onPointerEnter,
}: AromaSectorProps) {
  return (
    <g
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      style={{ cursor: 'pointer' }}
    >
      <path
        d={pathData}
        fill={sector.hex}
        stroke="var(--bg-card)"
        strokeWidth={1}
        fillOpacity={isActive ? 1.0 : 0.25}
        style={{ transition: 'fill-opacity 0.15s ease-out' }}
      />
      <text
        x={labelPosition.x}
        y={labelPosition.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isActive ? 'var(--text)' : 'var(--text-hint)'}
        fontSize={isActive ? 10 : 9}
        fontWeight={isActive ? 600 : 400}
        style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.15s ease-out, font-size 0.15s ease-out' }}
      >
        {sector.nameKo}
      </text>
    </g>
  )
}
