'use client'

import type { QuadrantReferencePoint } from '@/domain/entities/quadrant'
import { QuadrantRefDot } from '@/presentation/components/record/quadrant-ref-dot'

interface QuadrantDisplayProps {
  type: 'restaurant' | 'wine'
  points: QuadrantReferencePoint[]
  currentPoint?: QuadrantReferencePoint
}

const AXIS_LABELS = {
  restaurant: { xLeft: '저렴', xRight: '고가', yTop: '포멀', yBottom: '캐주얼' },
  wine: { xLeft: '산미 낮음', xRight: '산미 높음', yTop: 'Full Body', yBottom: 'Light Body' },
} as const

export function QuadrantDisplay({ type, points, currentPoint }: QuadrantDisplayProps) {
  const labels = AXIS_LABELS[type]

  if (points.length === 0 && !currentPoint) {
    return (
      <div className="px-4 py-6 text-center">
        <p style={{ fontSize: '14px', color: 'var(--text-hint)' }}>
          기록이 2개 이상이면 맵이 표시됩니다
        </p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-center px-4">
      <span className="mb-1" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-hint)' }}>
        {labels.yTop}
      </span>

      <div className="flex w-full max-w-[280px] items-center gap-1">
        <span className="w-12 shrink-0 text-right" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-hint)' }}>
          {labels.xLeft}
        </span>

        <div
          className="relative w-full"
          style={{
            aspectRatio: '1 / 1',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
          }}
        >
          <div className="absolute left-0 right-0" style={{ top: '50%', height: '1px', borderTop: '1px dashed var(--border)' }} />
          <div className="absolute bottom-0 top-0" style={{ left: '50%', width: '1px', borderLeft: '1px dashed var(--border)' }} />

          {points.slice(0, 12).map((p, i) => (
            <QuadrantRefDot key={i} x={p.x} y={p.y} satisfaction={p.satisfaction} name={p.name} score={p.score} />
          ))}

          {currentPoint && (
            <div
              className="absolute z-10 flex items-center justify-center rounded-full"
              style={{
                left: `${currentPoint.x}%`,
                bottom: `${currentPoint.y}%`,
                transform: 'translate(-50%, 50%)',
                width: '32px',
                height: '32px',
                backgroundColor: type === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)',
                boxShadow: `0 0 12px ${type === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'}80`,
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF' }}>
                {currentPoint.score}
              </span>
            </div>
          )}
        </div>

        <span className="w-12 shrink-0" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-hint)' }}>
          {labels.xRight}
        </span>
      </div>

      <span className="mt-1" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-hint)' }}>
        {labels.yBottom}
      </span>
    </div>
  )
}
