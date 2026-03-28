'use client'

import { Wine } from 'lucide-react'

interface CompactListItemProps {
  rank: number
  thumbnailUrl: string | null
  name: string
  meta: string
  score: number | null
  accentType: 'restaurant' | 'wine'
  onClick: () => void
}

export function CompactListItem({
  rank,
  thumbnailUrl,
  name,
  meta,
  score,
  accentType,
  onClick,
}: CompactListItemProps) {
  const isTop3 = rank <= 3
  const typeClass = accentType === 'wine' ? 'wine' : ''

  return (
    <button
      type="button"
      onClick={onClick}
      className="compact-item w-full text-left transition-transform active:scale-[0.985]"
    >
      <span className={`compact-rank ${isTop3 ? `top ${typeClass}` : ''}`}>
        {rank}
      </span>

      {thumbnailUrl ? (
        <div
          className="compact-thumb bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
        />
      ) : accentType === 'wine' ? (
        <div
          className="compact-thumb flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #2a2030, #1a1520)' }}
        >
          <Wine size={16} color="rgba(255,255,255,0.4)" />
        </div>
      ) : (
        <div
          className="compact-thumb"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="compact-name">{name}</p>
        <p className="compact-meta">{meta}</p>
      </div>

      <span className={`compact-score ${score != null ? (accentType === 'wine' ? 'wine' : 'food') : 'unrated'}`}>
        {score != null ? score : '—'}
      </span>
    </button>
  )
}
