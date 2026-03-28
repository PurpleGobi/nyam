'use client'

import { Users } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleCardProps {
  bubble: Bubble
  role: 'mine' | 'joined' | null
  isRecentlyActive?: boolean
  onClick: () => void
}

export function BubbleCard({ bubble, role, isRecentlyActive = false, onClick }: BubbleCardProps) {

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl p-4 text-left"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* 아이콘 40×40 */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
      >
        <BubbleIcon icon={bubble.icon} size={20} />
      </div>

      {/* 이름 + 메타 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-bold" style={{ color: 'var(--text)' }}>{bubble.name}</p>
          {role && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={
                role === 'mine'
                  ? { backgroundColor: 'var(--accent-food-light)', color: 'var(--accent-food)' }
                  : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-sub)' }
              }
            >
              {role === 'mine' ? '운영' : '가입'}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-hint)' }}>
          <Users size={11} />
          <span>멤버 {bubble.memberCount}명</span>
          <span>·</span>
          <span>기록 {bubble.recordCount}개</span>
        </div>
      </div>

      {/* Activity dot */}
      {isRecentlyActive && (
        <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: 'var(--positive)' }} />
      )}
    </button>
  )
}
