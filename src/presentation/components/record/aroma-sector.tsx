'use client'

import type { AromaSectorMeta } from '@/domain/entities/aroma'

interface AromaSectorProps {
  sector: AromaSectorMeta
  pathData: string
  labelPosition: { x: number; y: number }
  isActive: boolean
  readOnly?: boolean
  onPointerDown: () => void
  onPointerEnter: () => void
}

export function AromaSector({
  sector,
  pathData,
  labelPosition,
  isActive,
  readOnly = false,
  onPointerDown,
  onPointerEnter,
}: AromaSectorProps) {
  // readOnly + 비활성: 그레이스케일
  const fillColor = sector.hex
  const fillOpacity = isActive ? 1.0 : 0.05

  return (
    <g
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      style={{ cursor: readOnly ? 'default' : 'pointer' }}
    >
      <path
        d={pathData}
        fill={fillColor}
        stroke="var(--bg-card)"
        strokeWidth={1}
        fillOpacity={fillOpacity}
        style={{ transition: 'fill-opacity 0.15s ease-out, fill 0.15s ease-out' }}
      />
      <text
        x={labelPosition.x}
        y={labelPosition.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isActive ? 'var(--text)' : 'var(--text)'}
        fontSize={sector.ring === 1 ? (isActive ? 13 : 12) : sector.ring === 2 ? (isActive ? 12 : 11) : (isActive ? 11 : 10)}
        fontWeight={isActive ? 700 : 500}
        style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.15s ease-out, font-size 0.15s ease-out' }}
      >
        {sector.nameKo}
      </text>
    </g>
  )
}
