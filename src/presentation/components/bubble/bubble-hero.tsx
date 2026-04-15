'use client'

import { Info, Settings, UserPlus, Users, Sparkles } from 'lucide-react'
import type { Bubble, BubbleMemberRole } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleHeroProps {
  bubble: Bubble
  myRole: BubbleMemberRole | null
  tasteMatchPct: number | null
  memberAvatars?: Array<{ name: string; color: string }>
  onInfoClick: () => void
  onSettingsClick: () => void
  onInviteClick: () => void
}

export function BubbleHero({
  bubble,
  myRole,
  tasteMatchPct,
  memberAvatars = [],
  onInfoClick,
  onSettingsClick,
  onInviteClick,
}: BubbleHeroProps) {
  const isOwner = myRole === 'owner'
  return (
    <div className="relative" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="px-4 pb-3 pt-4">
        {/* 상단: 아이콘 + 이름/설명 가로 배치 */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', color: 'var(--text-inverse)' }}
          >
            <BubbleIcon icon={bubble.icon} size={24} />
          </div>

          <div className="min-w-0 flex-1">
            {/* 이름 + 액션 버튼 */}
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[18px] font-black" style={{ color: 'var(--text)' }}>{bubble.name}</span>
              <button type="button" onClick={onInfoClick} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--bg-card)' }}>
                <Info size={12} style={{ color: 'var(--text-hint)' }} />
              </button>
              {isOwner && (
                <button type="button" onClick={onSettingsClick} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <Settings size={12} style={{ color: 'var(--text-hint)' }} />
                </button>
              )}
            </div>

            {/* 설명 */}
            {bubble.description && (
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug" style={{ color: 'var(--text-sub)' }}>
                {bubble.description}
              </p>
            )}
          </div>
        </div>

        {/* 하단: 좌=멤버 정보 / 우=취향+초대 */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {/* 좌: 아바타 + 멤버 수 */}
          <div className="flex min-w-0 items-center gap-1.5">
            {memberAvatars.length > 0 && (
              <div className="flex shrink-0 -space-x-1.5">
                {memberAvatars.slice(0, 4).map((m, i) => (
                  <div
                    key={i}
                    className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[8px] font-bold ring-[1.5px] ring-[var(--bg)]"
                    style={{ backgroundColor: m.color, color: 'var(--text-inverse)', zIndex: 4 - i }}
                  >
                    {m.name.charAt(0)}
                  </div>
                ))}
                {bubble.memberCount > 4 && (
                  <div
                    className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[7px] font-bold ring-[1.5px] ring-[var(--bg)]"
                    style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-sub)' }}
                  >
                    +{bubble.memberCount - 4}
                  </div>
                )}
              </div>
            )}
            <span
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent-social)', border: '1px solid var(--border)' }}
            >
              <Users size={11} />
              {bubble.memberCount}명
            </span>
          </div>

          {/* 우: 취향 유사도 + 초대 */}
          <div className="flex shrink-0 items-center gap-1.5">
            {tasteMatchPct !== null && (
              <div
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <Sparkles size={10} style={{ color: tasteMatchPct >= 80 ? 'var(--positive)' : 'var(--accent-social)' }} />
                <div className="h-[4px] w-[24px] overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${tasteMatchPct}%`,
                      backgroundColor: tasteMatchPct >= 80 ? 'var(--positive)' : tasteMatchPct >= 50 ? 'var(--caution)' : 'var(--text-hint)',
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-bold"
                  style={{ color: tasteMatchPct >= 80 ? 'var(--positive)' : 'var(--accent-social)' }}
                >
                  {tasteMatchPct}%
                </span>
              </div>
            )}

            {myRole && myRole !== 'follower' && (
              <button
                type="button"
                onClick={onInviteClick}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-transform active:scale-95"
                style={{ backgroundColor: 'var(--accent-social)', color: 'var(--text-inverse)' }}
              >
                <UserPlus size={11} />
                초대
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
