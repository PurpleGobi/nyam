'use client'

import { useRef, useState, useCallback } from 'react'
import { getCircleRatingSize } from '@/domain/entities/quadrant'
import { getGaugeColor } from '@/shared/utils/gauge-color'
import { QuadrantDot } from '@/presentation/components/record/quadrant-dot'
import { QuadrantRefDot } from '@/presentation/components/record/quadrant-ref-dot'

interface QuadrantInputProps {
  /** 'restaurant': X=가격, Y=분위기 / 'wine': X=산미, Y=바디 */
  type: 'restaurant' | 'wine'
  value: { x: number; y: number; satisfaction: number }
  onChange: (value: { x: number; y: number; satisfaction: number }) => void
  referencePoints?: Array<{
    x: number
    y: number
    satisfaction: number
    name: string
    score: number
  }>
}

const AXIS_LABELS = {
  restaurant: {
    xLeft: '저렴',
    xRight: '고가',
    yTop: '포멀',
    yBottom: '캐주얼',
  },
  wine: {
    xLeft: '산미 낮음',
    xRight: '산미 높음',
    yTop: 'Full Body',
    yBottom: 'Light Body',
  },
} as const

export function QuadrantInput({ type, value, onChange, referencePoints = [] }: QuadrantInputProps) {
  const quadrantRef = useRef<HTMLDivElement>(null)
  const [isDraggingPosition, setIsDraggingPosition] = useState(false)
  const [isDraggingSatisfaction, setIsDraggingSatisfaction] = useState(false)
  const dragStartRef = useRef<{ y: number; satisfaction: number } | null>(null)

  const labels = AXIS_LABELS[type]
  const gaugeColor = getGaugeColor(value.satisfaction)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const rect = quadrantRef.current?.getBoundingClientRect()
      if (!rect) return

      const relX = (e.clientX - rect.left) / rect.width
      const relY = 1 - (e.clientY - rect.top) / rect.height

      const dotX = value.x / 100
      const dotY = value.y / 100
      const distance = Math.sqrt((relX - dotX) ** 2 + (relY - dotY) ** 2)

      const dotRadius = getCircleRatingSize(value.satisfaction) / 2 / rect.width

      if (distance < dotRadius * 1.5) {
        setIsDraggingSatisfaction(true)
        dragStartRef.current = { y: e.clientY, satisfaction: value.satisfaction }
        navigator?.vibrate?.(10)
      } else {
        setIsDraggingPosition(true)
        const newX = Math.max(0, Math.min(100, Math.round(relX * 100)))
        const newY = Math.max(0, Math.min(100, Math.round(relY * 100)))
        onChange({ x: newX, y: newY, satisfaction: value.satisfaction })
        navigator?.vibrate?.(10)
      }

      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [value, onChange],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDraggingPosition) {
        const rect = quadrantRef.current?.getBoundingClientRect()
        if (!rect) return

        const relX = (e.clientX - rect.left) / rect.width
        const relY = 1 - (e.clientY - rect.top) / rect.height
        const newX = Math.max(0, Math.min(100, Math.round(relX * 100)))
        const newY = Math.max(0, Math.min(100, Math.round(relY * 100)))

        if (
          (value.x < 50 && newX >= 50) ||
          (value.x >= 50 && newX < 50) ||
          (value.y < 50 && newY >= 50) ||
          (value.y >= 50 && newY < 50)
        ) {
          navigator?.vibrate?.(15)
        }

        onChange({ x: newX, y: newY, satisfaction: value.satisfaction })
      }

      if (isDraggingSatisfaction && dragStartRef.current) {
        const deltaY = dragStartRef.current.y - e.clientY
        const sensitivity = 0.5
        const newSat = Math.max(
          1,
          Math.min(100, Math.round(dragStartRef.current.satisfaction + deltaY * sensitivity)),
        )

        if (Math.floor(value.satisfaction / 10) !== Math.floor(newSat / 10)) {
          navigator?.vibrate?.(15)
        }

        onChange({ x: value.x, y: value.y, satisfaction: newSat })
      }
    },
    [isDraggingPosition, isDraggingSatisfaction, value, onChange],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      setIsDraggingPosition(false)
      setIsDraggingSatisfaction(false)
      dragStartRef.current = null
      e.currentTarget.releasePointerCapture(e.pointerId)
    },
    [],
  )

  return (
    <div className="flex w-full flex-col items-center">
      {/* Y축 상단 라벨 */}
      <span
        className="mb-1"
        style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-hint)' }}
      >
        {labels.yTop}
      </span>

      {/* 사분면 영역 + X축 라벨 */}
      <div className="flex w-full max-w-[320px] items-center gap-1">
        {/* X축 좌 라벨 */}
        <span
          className="shrink-0"
          style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-hint)', width: '48px', textAlign: 'right' }}
        >
          {labels.xLeft}
        </span>

        {/* 사분면 */}
        <div
          ref={quadrantRef}
          className="relative w-full"
          style={{
            aspectRatio: '1 / 1',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            touchAction: 'none',
            cursor: 'crosshair',
            overflow: 'hidden',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* 십자선 */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: '50%',
              height: '1px',
              borderTop: '1px dashed var(--border)',
            }}
          />
          <div
            className="absolute bottom-0 top-0"
            style={{
              left: '50%',
              width: '1px',
              borderLeft: '1px dashed var(--border)',
            }}
          />

          {/* 참조 점 (최대 12개) */}
          {referencePoints.slice(0, 12).map((point, i) => (
            <QuadrantRefDot
              key={i}
              x={point.x}
              y={point.y}
              satisfaction={point.satisfaction}
              name={point.name}
              score={point.score}
            />
          ))}

          {/* 현재 점 */}
          <QuadrantDot
            x={value.x}
            y={value.y}
            satisfaction={value.satisfaction}
            isDragging={isDraggingSatisfaction}
          />
        </div>

        {/* X축 우 라벨 */}
        <span
          className="shrink-0"
          style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-hint)', width: '48px' }}
        >
          {labels.xRight}
        </span>
      </div>

      {/* Y축 하단 라벨 */}
      <span
        className="mt-1"
        style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-hint)' }}
      >
        {labels.yBottom}
      </span>

      {/* 힌트 텍스트 */}
      <p
        className="mt-2 text-center"
        style={{ fontSize: '11px', color: 'var(--text-hint)' }}
      >
        좌우 드래그: 위치 이동 · 원 위에서 상하 드래그: 만족도(크기) 변경
      </p>

      {/* 수치 칩 */}
      <div className="mt-3 flex gap-2">
        <div
          className="px-2.5 py-1"
          style={{
            borderRadius: 'var(--r-sm)',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          X: {value.x}%
        </div>
        <div
          className="px-2.5 py-1"
          style={{
            borderRadius: 'var(--r-sm)',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          Y: {value.y}%
        </div>
        <div
          className="px-2.5 py-1"
          style={{
            borderRadius: 'var(--r-sm)',
            backgroundColor: `${gaugeColor}26`,
            border: '1px solid var(--border)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          만족도: {value.satisfaction}
        </div>
      </div>
    </div>
  )
}
