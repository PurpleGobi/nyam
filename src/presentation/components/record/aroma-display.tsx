'use client'

import type { AromaSectorId } from '@/domain/entities/aroma'
import { AROMA_SECTORS } from '@/shared/constants/aroma-sectors'
import { finishToSeconds } from '@/domain/entities/wine-structure'

interface AromaDisplayProps {
  aromaRegions: Record<string, unknown> | null
  aromaLabels: string[] | null
  complexity: number | null
  finish: number | null
  balance: number | null
}

/** 읽기 전용 미니 아로마 휠 (SVG) */
function MiniAromaWheel({ activeIds }: { activeIds: AromaSectorId[] }) {
  const CX = 80
  const CY = 80

  const RING_CONFIG = {
    1: { outer: 72, inner: 50, count: 8, startAngle: -90, step: 45 },
    2: { outer: 50, inner: 32, count: 4, startAngle: -67.5, step: 90 },
    3: { outer: 32, inner: 10, count: 3, startAngle: -90, step: 120 },
  } as const

  function toRad(deg: number): number {
    return (deg * Math.PI) / 180
  }

  function describeArc(outerR: number, innerR: number, startDeg: number, endDeg: number): string {
    const startOuter = { x: CX + outerR * Math.cos(toRad(startDeg)), y: CY + outerR * Math.sin(toRad(startDeg)) }
    const endOuter = { x: CX + outerR * Math.cos(toRad(endDeg)), y: CY + outerR * Math.sin(toRad(endDeg)) }
    const startInner = { x: CX + innerR * Math.cos(toRad(endDeg)), y: CY + innerR * Math.sin(toRad(endDeg)) }
    const endInner = { x: CX + innerR * Math.cos(toRad(startDeg)), y: CY + innerR * Math.sin(toRad(startDeg)) }
    const largeArc = endDeg - startDeg > 180 ? 1 : 0
    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
      'Z',
    ].join(' ')
  }

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" className="mx-auto">
      {AROMA_SECTORS.map((sector) => {
        const ring = RING_CONFIG[sector.ring]
        const sectorIndex = AROMA_SECTORS.filter((s) => s.ring === sector.ring).indexOf(sector)
        const startAngle = ring.startAngle + sectorIndex * ring.step
        const endAngle = startAngle + ring.step - 1
        const isActive = activeIds.includes(sector.id)

        return (
          <path
            key={sector.id}
            d={describeArc(ring.outer, ring.inner, startAngle, endAngle)}
            fill={isActive ? sector.hex : 'var(--bg-elevated, #F0EDE8)'}
            stroke="var(--bg)"
            strokeWidth="1.5"
            opacity={isActive ? 1 : 0.4}
          />
        )
      })}
    </svg>
  )
}

export function AromaDisplay({ aromaRegions, aromaLabels, complexity, finish, balance }: AromaDisplayProps) {
  if (!aromaRegions || !aromaLabels || aromaLabels.length === 0) return null

  const activeIds = Object.keys(aromaRegions) as AromaSectorId[]

  return (
    <div className="flex flex-col gap-3">
      {/* 미니 아로마 휠 (읽기 전용) */}
      <MiniAromaWheel activeIds={activeIds} />

      {/* 아로마 라벨 칩 */}
      <div className="flex flex-wrap gap-1.5">
        {aromaLabels.map((label) => {
          const sector = AROMA_SECTORS.find((s) => s.nameKo === label)
          return (
            <span
              key={label}
              className="rounded-full px-2.5 py-1"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: sector ? `${sector.hex}20` : 'var(--bg)',
                color: sector ? sector.hex : 'var(--text-sub)',
                border: `1px solid ${sector ? `${sector.hex}40` : 'var(--border)'}`,
              }}
            >
              {label}
            </span>
          )
        })}
      </div>

      {/* 구조 평가 요약 */}
      {(complexity !== null || finish !== null || balance !== null) && (
        <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
          {[
            complexity !== null ? `복합성 ${complexity}` : null,
            finish !== null ? `여운 ${finishToSeconds(finish)}초+` : null,
            balance !== null ? `균형 ${balance}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  )
}
