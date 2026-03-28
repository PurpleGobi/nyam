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
  const accentColor = accentType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 text-left transition-transform active:scale-[0.985]"
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span
        className="min-w-[20px] text-right text-[14px] font-bold"
        style={{ color: isTop3 ? accentColor : 'var(--text-hint)' }}
      >
        {rank}
      </span>

      {thumbnailUrl ? (
        <div
          className="h-10 w-10 shrink-0 rounded-[10px] bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
        />
      ) : accentType === 'wine' ? (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: 'linear-gradient(135deg, #2a2030, #1a1520)' }}
        >
          <Wine size={16} color="rgba(255,255,255,0.4)" />
        </div>
      ) : (
        <div
          className="h-10 w-10 shrink-0 rounded-[10px]"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
          {name}
        </p>
        <p className="truncate text-[12px]" style={{ color: 'var(--text-sub)' }}>
          {meta}
        </p>
      </div>

      <span
        className="shrink-0 text-[18px] font-bold"
        style={{ color: score != null ? accentColor : 'var(--text-hint)' }}
      >
        {score != null ? score : '—'}
      </span>
    </button>
  )
}
