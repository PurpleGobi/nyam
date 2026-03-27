'use client'

import { getGaugeColor } from '@/shared/utils/gauge-color'

interface MiniDot {
  x: number
  y: number
  satisfaction: number
  isCurrent: boolean
}

interface MiniQuadrantProps {
  dots: MiniDot[]
  type: 'restaurant' | 'wine'
  onTap?: () => void
}

const LABELS = {
  restaurant: { xL: '저렴', xR: '고가', yT: '포멀', yB: '캐주얼' },
  wine: { xL: '산미↓', xR: '산미↑', yT: 'Full', yB: 'Light' },
}

export function MiniQuadrant({ dots, type, onTap }: MiniQuadrantProps) {
  const labels = LABELS[type]

  return (
    <div
      className="relative mx-auto w-full max-w-[240px] cursor-pointer"
      style={{ aspectRatio: '1/1', height: '192px' }}
      onClick={onTap}
    >
      {/* 축 라벨 */}
      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[9px] text-[var(--text-hint)]">{labels.xL}</span>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] text-[var(--text-hint)]">{labels.xR}</span>
      <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[9px] text-[var(--text-hint)]">{labels.yT}</span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] text-[var(--text-hint)]">{labels.yB}</span>

      {/* 사분면 영역 */}
      <div
        className="absolute inset-4 overflow-hidden rounded-lg"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="absolute left-0 right-0" style={{ top: '50%', height: '1px', borderTop: '1px dashed var(--border)' }} />
        <div className="absolute bottom-0 top-0" style={{ left: '50%', width: '1px', borderLeft: '1px dashed var(--border)' }} />

        {dots.map((dot, i) => {
          const size = dot.isCurrent ? Math.max(16, dot.satisfaction * 0.42 + 12) : Math.max(10, dot.satisfaction * 0.3 + 8)
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${dot.x}%`,
                bottom: `${dot.y}%`,
                transform: 'translate(-50%, 50%)',
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: getGaugeColor(dot.satisfaction),
                opacity: dot.isCurrent ? 1 : 0.3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {dot.isCurrent && (
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#FFFFFF' }}>
                  {dot.satisfaction}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
