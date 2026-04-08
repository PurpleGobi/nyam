'use client'

// R4: props만 받음. domain type import 허용.

interface ConfidenceBadgeProps {
  confidence: number // 0~1
}

/** 확신도 >= 0.5 → "확신 높음", 0.3~0.5 → "참고용", < 0.3 → 렌더링 안 함 */
export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (confidence < 0.3) return null

  const isHigh = confidence >= 0.5
  const label = isHigh ? '확신 높음' : '참고용'

  return (
    <span
      style={{
        fontSize: '8px',
        fontWeight: 500,
        color: isHigh ? 'var(--positive)' : 'var(--caution)',
        lineHeight: 1.2,
      }}
    >
      {label}
    </span>
  )
}
