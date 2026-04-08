'use client'

// R4: props만 받음. domain type import 허용.

interface ConfidenceBadgeProps {
  confidence: number // 0~1
}

/** 신뢰도 % 표시. 점수가 있으면 항상 렌더링. */
export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100)
  const color = confidence >= 0.5
    ? 'var(--positive)'
    : confidence >= 0.3
      ? 'var(--text-sub)'
      : 'var(--text-hint)'

  return (
    <span
      style={{
        fontSize: '8px',
        fontWeight: 500,
        color,
        lineHeight: 1.2,
      }}
    >
      신뢰도 {pct}%
    </span>
  )
}
