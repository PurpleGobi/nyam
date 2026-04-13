'use client'

interface MiniScoreBadgesProps {
  myScore: number | null
  nyamScore: number | null
  bubbleScore: number | null
  accentType: 'restaurant' | 'wine'
}

/**
 * 3종 점수를 소형 뱃지로 표시 (홈 카드/리스트용).
 * 값이 있는 점수만 렌더링. 내 점수는 accent 색, 나머지는 muted.
 */
export function MiniScoreBadges({ myScore, nyamScore, bubbleScore, accentType }: MiniScoreBadgesProps) {
  const accentColor = accentType === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)'
  const hasAny = myScore !== null || nyamScore !== null || bubbleScore !== null
  if (!hasAny) return null

  return (
    <div className="flex items-center gap-1">
      {myScore !== null && (
        <Badge label="나" value={myScore} color={accentColor} bold />
      )}
      {nyamScore !== null && (
        <Badge label="N" value={nyamScore} color="var(--primary)" />
      )}
      {bubbleScore !== null && (
        <Badge label="B" value={bubbleScore} color="var(--accent-social)" />
      )}
    </div>
  )
}

function Badge({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
      style={{
        fontSize: '10px',
        fontWeight: bold ? 700 : 600,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: '9px' }}>{label}</span>
      {value}
    </span>
  )
}
