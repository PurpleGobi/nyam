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

/** hex → 상대 휘도 (0~1) */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** 링별 기본 폰트 사이즈 */
const BASE_SIZE: Record<number, number> = { 1: 11, 2: 10, 3: 9 }

/** 글자 수 기반 동적 사이즈 (줄바꿈 후 가장 긴 파트 기준) */
function getFontSize(ring: number, nameKo: string, active: boolean): number {
  const base = BASE_SIZE[ring] ?? 11
  const parts = nameKo.split('/')
  const longest = Math.max(...parts.map((p) => p.length))
  // 긴 이름은 축소
  let size = base
  if (ring === 1 && longest >= 4) size = base - 1
  if (ring === 2 && longest >= 3) size = base - 1
  if (active) size += 1
  return size
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
  const fillColor = sector.hex
  const fillOpacity = isActive ? 1.0 : 0.05
  const fontSize = getFontSize(sector.ring, sector.nameKo, isActive)

  // 활성 시 배경 밝기에 따라 텍스트 색상 결정
  const textColor = isActive
    ? (luminance(sector.hex) > 0.55 ? '#1a1a1a' : '#ffffff')
    : 'var(--text)'

  // '/' 기준 줄바꿈 (모든 링)
  const nameParts = sector.nameKo.split('/')

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
        fill={textColor}
        fontSize={fontSize}
        fontWeight={isActive ? 700 : 500}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          transition: 'fill 0.15s ease-out, font-size 0.15s ease-out',
          textShadow: isActive
            ? (luminance(sector.hex) > 0.55 ? 'none' : '0 0 3px rgba(0,0,0,0.5)')
            : 'none',
        }}
      >
        {nameParts.length > 1 ? (
          nameParts.map((part, i) => (
            <tspan
              key={i}
              x={labelPosition.x}
              dy={i === 0 ? `${-(nameParts.length - 1) * 0.35}em` : '0.85em'}
            >
              {part}
            </tspan>
          ))
        ) : (
          sector.nameKo
        )}
      </text>
    </g>
  )
}
