'use client'

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
 * 각 dot 색상은 해당 멤버의 avatarColor 사용.
 */
export function BubbleQuadrant({ dots, size = 52 }: BubbleQuadrantProps) {
  const INSET = 8
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
      {/* 멤버별 dot */}
      {dots.map((dot, i) => {
        const dotLeft = INSET + (dot.axisX / 100) * safeRange
        const dotTop = INSET + ((100 - dot.axisY) / 100) * safeRange
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${dotLeft}px`,
              top: `${dotTop}px`,
              width: `${DOT_SIZE}px`,
              height: `${DOT_SIZE}px`,
              backgroundColor: dot.avatarColor,
              transform: 'translate(-50%, -50%)',
              zIndex: i + 1,
              border: '1px solid var(--bg-page)',
            }}
          />
        )
      })}
    </div>
  )
}
