'use client'

import { formatTimeAgo } from '@/shared/utils/date-format'

interface FeedCompactProps {
  recordId: string
  authorName: string
  targetName: string
  targetType: 'restaurant' | 'wine'
  targetMeta: string | null
  satisfaction: number | null
  sharedAt: string
  onClick: () => void
}

export function FeedCompact({
  authorName,
  targetName,
  targetType,
  targetMeta,
  satisfaction,
  sharedAt,
  onClick,
}: FeedCompactProps) {
  const timeAgo = formatTimeAgo(sharedAt)
  const scoreColor = targetType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      {/* 점수 배지 42×42 */}
      <div
        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-[16px] font-black text-white"
        style={{ backgroundColor: scoreColor }}
      >
        {satisfaction !== null ? Math.round(satisfaction) : '-'}
      </div>

      {/* 장소명 + 메타 */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold" style={{ color: 'var(--text)' }}>{targetName}</p>
        <p className="truncate text-[11px]" style={{ color: 'var(--text-hint)' }}>
          {targetMeta ?? ''}{targetMeta ? ' · ' : ''}{authorName}
        </p>
      </div>

      {/* 시간 */}
      <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-hint)' }}>{timeAgo}</span>
    </button>
  )
}

