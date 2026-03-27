'use client'

interface FeedCompactProps {
  recordId: string
  authorName: string
  restaurantName?: string
  wineName?: string
  satisfaction?: number
  sharedAt: string
  onClick?: () => void
}

export function FeedCompact({
  authorName,
  restaurantName,
  wineName,
  satisfaction,
  sharedAt,
  onClick,
}: FeedCompactProps) {
  const date = new Date(sharedAt)
  const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}>
        {authorName[0]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[var(--text)]">
          {restaurantName ?? wineName ?? '기록'}
        </p>
        <p className="text-[11px] text-[var(--text-hint)]">{authorName} · {dateLabel}</p>
      </div>
      {satisfaction !== undefined && (
        <span className="shrink-0 text-[13px] font-bold" style={{ color: 'var(--accent-food)' }}>
          {satisfaction.toFixed(1)}
        </span>
      )}
    </button>
  )
}
