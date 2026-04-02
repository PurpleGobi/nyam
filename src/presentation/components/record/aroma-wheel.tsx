'use client'

import { useCallback, useRef } from 'react'
import type { AromaSectorId, AromaSelection, AromaRing } from '@/domain/entities/aroma'
import { AROMA_SECTORS, RING_LABELS } from '@/shared/constants/aroma-sectors'
import { AromaSector } from '@/presentation/components/record/aroma-sector'

interface AromaWheelProps {
  value: AromaSelection
  onChange?: (value: AromaSelection) => void
  readOnly?: boolean
}

const CX = 150
const CY = 150

const RING_CONFIG = {
  1: { outer: 140, inner: 100, count: 9, startAngle: -90, step: 40 },
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

/** 모든 활성 섹터 ID를 AromaSelection에서 추출 */
function getAllActiveIds(sel: AromaSelection): AromaSectorId[] {
  return [...sel.primary, ...sel.secondary, ...sel.tertiary]
}

/** 섹터 ID가 활성인지 확인 */
function isActive(sel: AromaSelection, id: AromaSectorId): boolean {
  return sel.primary.includes(id) || sel.secondary.includes(id) || sel.tertiary.includes(id)
}

/** 선택된 향을 1차/2차/3차 링별로 그룹화 */
function groupByRing(sel: AromaSelection) {
  const groups: { ring: AromaRing; label: string; sectors: { id: AromaSectorId; nameKo: string; hex: string }[] }[] = []

  const ringData: [AromaRing, AromaSectorId[]][] = [
    [1, sel.primary],
    [2, sel.secondary],
    [3, sel.tertiary],
  ]

  for (const [ring, ids] of ringData) {
    if (ids.length === 0) continue
    const sectors = ids
      .map((id) => AROMA_SECTORS.find((s) => s.id === id))
      .filter((s): s is (typeof AROMA_SECTORS)[number] => s !== undefined)
      .map((s) => ({ id: s.id, nameKo: s.nameKo, hex: s.hex }))
    if (sectors.length > 0) {
      groups.push({ ring, label: RING_LABELS[ring], sectors })
    }
  }
  return groups
}

/** 섹터의 ring에 따라 올바른 배열에 추가/제거 */
function toggleInSelection(sel: AromaSelection, sectorId: AromaSectorId): AromaSelection {
  const sector = AROMA_SECTORS.find((s) => s.id === sectorId)
  if (!sector) return sel

  const newSel = { primary: [...sel.primary], secondary: [...sel.secondary], tertiary: [...sel.tertiary] }
  const key = sector.ring === 1 ? 'primary' : sector.ring === 2 ? 'secondary' : 'tertiary'
  const arr = newSel[key]
  const idx = arr.indexOf(sectorId)
  if (idx >= 0) {
    arr.splice(idx, 1)
  } else {
    arr.push(sectorId)
  }
  return newSel
}

export function AromaWheel({ value, onChange, readOnly = false }: AromaWheelProps) {
  const isDraggingRef = useRef(false)

  const toggleSector = useCallback(
    (sectorId: AromaSectorId) => {
      if (readOnly || !onChange) return
      onChange(toggleInSelection(value, sectorId))
    },
    [value, onChange, readOnly],
  )

  const handlePointerDown = useCallback(
    (sectorId: AromaSectorId) => {
      if (readOnly) return
      isDraggingRef.current = true
      toggleSector(sectorId)
    },
    [toggleSector, readOnly],
  )

  const handlePointerEnter = useCallback(
    (sectorId: AromaSectorId) => {
      if (readOnly || !isDraggingRef.current) return
      if (!isActive(value, sectorId)) {
        toggleSector(sectorId)
      }
    },
    [value, toggleSector, readOnly],
  )

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const activeIds = getAllActiveIds(value)
  const ringGroups = groupByRing(value)

  return (
    <div className="flex w-full flex-col items-center">
      {!readOnly && (
        <span style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px' }}>
          향을 느껴보세요
        </span>
      )}
      <svg
        viewBox="0 0 300 300"
        className="w-full max-w-[360px]"
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
            isActive={isActive(value, sector.id)}
            readOnly={readOnly}
            onPointerDown={() => handlePointerDown(sector.id)}
            onPointerEnter={() => handlePointerEnter(sector.id)}
          />
        ))}
      </svg>

      {/* 선택된 향: 1차/2차/3차 텍스트 리스트 */}
      {activeIds.length > 0 ? (
        <div className="mt-3 flex w-full flex-col items-end gap-1">
          {ringGroups.map((group) => (
            <div key={group.ring} className="flex items-baseline gap-1.5">
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-hint)' }}>
                {group.ring}차
              </span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                {group.sectors.map((s) => s.nameKo).join(', ')}
              </span>
            </div>
          ))}
        </div>
      ) : !readOnly ? (
        <div className="mt-3 flex w-full items-center">
          <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
            탭하여 향을 선택하세요
          </span>
        </div>
      ) : null}
    </div>
  )
}
