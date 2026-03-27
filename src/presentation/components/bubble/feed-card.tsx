'use client'

import { Clock } from 'lucide-react'

interface FeedCardProps {
  recordId: string
  authorName: string
  authorAvatar: string | null
  sharedAt: string
  restaurantName?: string
  wineName?: string
  satisfaction?: number
  onClick?: () => void
}

export function FeedCard({
  authorName,
  authorAvatar,
  sharedAt,
  restaurantName,
  wineName,
  satisfaction,
  onClick,
}: FeedCardProps) {
  const timeAgo = formatTimeAgo(sharedAt)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-xl p-4 text-left"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* 작성자 */}
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
        >
          {authorAvatar ?? authorName[0]}
        </div>
        <span className="flex-1 text-[13px] font-semibold text-[var(--text)]">{authorName}</span>
        <span className="flex items-center gap-0.5 text-[11px] text-[var(--text-hint)]">
          <Clock size={11} />
          {timeAgo}
        </span>
      </div>

      {/* 기록 요약 */}
      <div>
        {restaurantName && (
          <p className="text-[14px] font-semibold text-[var(--text)]">{restaurantName}</p>
        )}
        {wineName && (
          <p className="text-[13px] text-[var(--text-sub)]">{wineName}</p>
        )}
      </div>

      {satisfaction !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-[12px]">😋</span>
          <span className="text-[13px] font-semibold text-[var(--text)]">{satisfaction.toFixed(1)}</span>
        </div>
      )}
    </button>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}
