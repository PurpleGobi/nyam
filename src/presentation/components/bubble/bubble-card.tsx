'use client'

import { Users } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'

interface BubbleCardProps {
  bubble: Bubble
  onClick?: () => void
}

export function BubbleCard({ bubble, onClick }: BubbleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl p-4 text-left"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', fontSize: '22px' }}
      >
        {bubble.icon ?? '🫧'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[var(--text)]">{bubble.name}</p>
        {bubble.description && (
          <p className="mt-0.5 truncate text-[12px] text-[var(--text-sub)]">{bubble.description}</p>
        )}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--text-hint)]">
          <Users size={11} />
          <span>{bubble.memberCount}명</span>
          <span>·</span>
          <span>기록 {bubble.recordCount}개</span>
        </div>
      </div>
    </button>
  )
}
