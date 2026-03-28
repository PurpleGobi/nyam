'use client'

import { Info, Settings, UserPlus, Users } from 'lucide-react'
import type { Bubble, BubbleMemberRole } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleHeroProps {
  bubble: Bubble
  myRole: BubbleMemberRole | null
  tasteMatchPct: number | null
  onInfoClick: () => void
  onSettingsClick: () => void
  onInviteClick: () => void
}

export function BubbleHero({
  bubble,
  myRole,
  tasteMatchPct,
  onInfoClick,
  onSettingsClick,
  onInviteClick,
}: BubbleHeroProps) {
  const isOwner = myRole === 'owner'

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-5">
      {/* 아이콘 + 이름 + 버튼 행 */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl"
          style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
        >
          <BubbleIcon icon={bubble.icon} size={26} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-bold" style={{ color: 'var(--text)' }}>{bubble.name}</span>
          <button type="button" onClick={onInfoClick} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--bg-card)' }}>
            <Info size={14} style={{ color: 'var(--text-hint)' }} />
          </button>
          {isOwner && (
            <button type="button" onClick={onSettingsClick} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--bg-card)' }}>
              <Settings size={14} style={{ color: 'var(--text-hint)' }} />
            </button>
          )}
        </div>
      </div>

      {/* 설명 */}
      {bubble.description && (
        <p className="text-center text-[13px] leading-snug" style={{ color: 'var(--text-sub)' }}>{bubble.description}</p>
      )}

      {/* 뱃지 3개 */}
      <div className="flex items-center gap-2">
        {/* 멤버 수 */}
        <span
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
          style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
        >
          <Users size={12} />
          멤버 {bubble.memberCount}명
        </span>

        {/* 취향 유사도 */}
        {tasteMatchPct !== null && (
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
            style={{ backgroundColor: 'var(--positive-light)', color: 'var(--positive)' }}
          >
            취향 {tasteMatchPct}%
          </span>
        )}

        {/* 초대 */}
        {myRole && myRole !== 'follower' && (
          <button
            type="button"
            onClick={onInviteClick}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
          >
            <UserPlus size={12} />
            초대
          </button>
        )}
      </div>
    </div>
  )
}
