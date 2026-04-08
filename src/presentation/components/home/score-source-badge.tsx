import type { ScoreSource } from '@/domain/entities/score'

const SOURCE_LABELS: Record<Exclude<ScoreSource, 'mine'>, string> = {
  nyam: 'Nyam',
  bubble: '버블',
}

interface ScoreSourceBadgeProps {
  source: Exclude<ScoreSource, 'mine'>
}

export function ScoreSourceBadge({ source }: ScoreSourceBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5"
      style={{
        fontSize: '9px',
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '-0.01em',
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-sub)',
        border: '1px solid var(--border)',
        verticalAlign: 'middle',
      }}
    >
      {SOURCE_LABELS[source]}
    </span>
  )
}
