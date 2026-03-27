'use client'

import { useCallback, useRef } from 'react'
import type { AromaSectorId, AromaSelection } from '@/domain/entities/aroma'
import { AROMA_SECTORS } from '@/shared/constants/aroma-sectors'
import { calculateAromaColor } from '@/shared/utils/aroma-color'
import { AromaSector } from '@/presentation/components/record/aroma-sector'

interface AromaWheelProps {
  value: AromaSelection
  onChange: (value: AromaSelection) => void
}

const CX = 150
const CY = 150

const RING_CONFIG = {
  1: { outer: 140, inner: 100, count: 8, startAngle: -90, step: 45 },
  2: { outer: 100, inner: 65, count: 4, startAngle: -67.5, step: 90 },
  3: { outer: 65, inner: 20, count: 3, startAngle: -90, step: 120 },
} as const

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function describeArc(
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = {
    x: CX + outerR * Math.cos(toRad(startAngle)),
    y: CY + outerR * Math.sin(toRad(startAngle)),
  }
  const outerEnd = {
    x: CX + outerR * Math.cos(toRad(endAngle)),
    y: CY + outerR * Math.sin(toRad(endAngle)),
  }
  const innerStart = {
    x: CX + innerR * Math.cos(toRad(endAngle)),
    y: CY + innerR * Math.sin(toRad(endAngle)),
  }
  const innerEnd = {
    x: CX + innerR * Math.cos(toRad(startAngle)),
    y: CY + innerR * Math.sin(toRad(startAngle)),
  }
  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ')
}

function getLabelPosition(
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): { x: number; y: number } {
  const midAngle = (startAngle + endAngle) / 2
  const midR = (outerR + innerR) / 2
  return {
    x: CX + midR * Math.cos(toRad(midAngle)),
    y: CY + midR * Math.sin(toRad(midAngle)),
  }
}

function buildSectorPaths() {
  const ringIndices = { 1: 0, 2: 0, 3: 0 }
  return AROMA_SECTORS.map((sector) => {
    const config = RING_CONFIG[sector.ring]
    const idx = ringIndices[sector.ring]
    ringIndices[sector.ring] += 1

    const startAngle = config.startAngle + idx * config.step
    const endAngle = startAngle + config.step

    return {
      sector,
      pathData: describeArc(config.outer, config.inner, startAngle, endAngle),
      labelPosition: getLabelPosition(config.outer, config.inner, startAngle, endAngle),
    }
  })
}

const SECTOR_PATHS = buildSectorPaths()

export function AromaWheel({ value, onChange }: AromaWheelProps) {
  const isDraggingRef = useRef(false)

  const toggleSector = useCallback(
    (sectorId: AromaSectorId) => {
      const newRegions = { ...value.regions }
      if (newRegions[sectorId]) {
        delete newRegions[sectorId]
      } else {
        newRegions[sectorId] = true
      }

      const activeIds = Object.keys(newRegions) as AromaSectorId[]
      const labels = activeIds
        .map((id) => AROMA_SECTORS.find((s) => s.id === id)?.nameKo)
        .filter(Boolean) as string[]
      const color = calculateAromaColor(activeIds)

      onChange({ regions: newRegions, labels, color })
    },
    [value, onChange],
  )

  const handlePointerDown = useCallback(
    (sectorId: AromaSectorId) => {
      isDraggingRef.current = true
      toggleSector(sectorId)
    },
    [toggleSector],
  )

  const handlePointerEnter = useCallback(
    (sectorId: AromaSectorId) => {
      if (!isDraggingRef.current) return
      if (!value.regions[sectorId]) {
        toggleSector(sectorId)
      }
    },
    [value.regions, toggleSector],
  )

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const activeIds = Object.keys(value.regions) as AromaSectorId[]

  return (
    <div className="flex w-full flex-col items-center">
      <svg
        viewBox="0 0 300 300"
        className="w-full max-w-[300px]"
        style={{ touchAction: 'none' }}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {SECTOR_PATHS.map(({ sector, pathData, labelPosition }) => (
          <AromaSector
            key={sector.id}
            sector={sector}
            pathData={pathData}
            labelPosition={labelPosition}
            isActive={!!value.regions[sector.id]}
            onPointerDown={() => handlePointerDown(sector.id)}
            onPointerEnter={() => handlePointerEnter(sector.id)}
          />
        ))}
      </svg>

      {/* 선택 요약 */}
      <div className="mt-3 flex w-full items-center gap-2">
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-hint)' }}>
          선택된 향:
        </span>
        {activeIds.length > 0 ? (
          <>
            {value.color && (
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: value.color,
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
              {value.labels.join(', ')}
            </span>
          </>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
            탭하여 향을 선택하세요
          </span>
        )}
      </div>
    </div>
  )
}
