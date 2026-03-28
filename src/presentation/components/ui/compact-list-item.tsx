'use client'

interface CompactListItemProps {
  rank?: number
  thumbnail?: React.ReactNode
  name: string
  meta?: string
  score?: number | null
  variant?: 'food' | 'wine'
}

export function CompactListItem({ rank, thumbnail, name, meta, score, variant = 'food' }: CompactListItemProps) {
  const isTop3 = rank != null && rank <= 3

  return (
    <div className="compact-item">
      {rank != null && (
        <span className={`compact-rank${isTop3 ? ` top${variant === 'wine' ? ' wine' : ''}` : ''}`}>
          {rank}
        </span>
      )}
      {thumbnail ?? (
        <div
          className="compact-thumb"
          style={{
            background: variant === 'wine'
              ? 'linear-gradient(135deg, var(--accent-wine-light), var(--accent-wine-dim))'
              : 'linear-gradient(135deg, var(--accent-food-light), var(--accent-food-dim))',
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="compact-name">{name}</p>
        {meta && <p className="compact-meta">{meta}</p>}
      </div>
      <span className={`compact-score ${score != null ? variant : 'unrated'}`}>
        {score ?? '—'}
      </span>
    </div>
  )
}
