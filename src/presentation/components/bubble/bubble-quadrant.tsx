'use client'

import { getGaugeColor } from '@/shared/utils/gauge-color'

export interface MemberDot {
  axisX: number       // 0~100
  axisY: number       // 0~100
  satisfaction: number // 1~100
  avatarColor: string
  nickname: string
}

interface BubbleQuadrantProps {
  dots: MemberDot[]
  size?: number
}

const DOT_SIZE = 6

/**
 * 버블 멤버들의 평가를 하나의 사분면에 멀티 dot으로 표시.
 * 디자인은 홈 MiniQuadrant 기반 — gaugeColor 기반 dot.
 * size prop으로 크기 조절 (기본 44px = 홈과 동일).
 */
export function BubbleQuadrant({ dots, size = 44 }: BubbleQuadrantProps) {
  const INSET = Math.round(size * 0.16) // 44→7, 56→9
  const safeRange = size - INSET * 2

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-[10px]"
      style={{
        width: `${size}px`,
        height: `${size}px`,
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
      {/* 멤버별 dot — 색상은 satisfaction 기반 (홈과 동일) */}
      {dots.map((dot, i) => {
        const dotLeft = INSET + (dot.axisX / 100) * safeRange
        const dotTop = INSET + ((100 - dot.axisY) / 100) * safeRange
        const dotColor = getGaugeColor(dot.satisfaction)
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${dotLeft}px`,
              top: `${dotTop}px`,
              width: `${DOT_SIZE}px`,
              height: `${DOT_SIZE}px`,
              backgroundColor: dotColor,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )
      })}
    </div>
  )
}
