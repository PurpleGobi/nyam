'use client'

import { getGaugeColor } from '@/shared/utils/gauge-color'

/** 홈 카드용 미니 사분면 (44x44) — 설계 §4 */
interface MiniQuadrantProps {
  axisX: number      // 0~100
  axisY: number      // 0~100
  satisfaction: number // 1~100
  accentColor: string  // --accent-food 또는 --accent-wine
}

/** dot 크기: 고정 6px (RATING_ENGINE 개편: 만족도 제거, 좌표만 표시) */
const DOT_SIZE = 6

export function MiniQuadrant({ axisX, axisY, satisfaction, accentColor }: MiniQuadrantProps) {
  const dotSize = DOT_SIZE
  const dotColor = getGaugeColor(satisfaction)
  const topPercent = 100 - axisY

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-[10px]"
      style={{
        width: '44px',
        height: '44px',
        backgroundColor: 'var(--bg-page)',
      }}
    >
      {/* 십자선 */}
      <span
        className="absolute left-0 right-0 top-1/2 h-px"
        style={{ backgroundColor: 'var(--border)' }}
      />
      <span
        className="absolute bottom-0 left-1/2 top-0 w-px"
        style={{ backgroundColor: 'var(--border)' }}
      />
      {/* dot */}
      <span
        className="absolute rounded-full"
        style={{
          left: `${axisX}%`,
          top: `${topPercent}%`,
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          backgroundColor: dotColor,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  )
}
