'use client'

import { Info, Settings, UserPlus, Users, Share2, Sparkles } from 'lucide-react'
import type { Bubble, BubbleMemberRole } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { BubbleActivityRing } from '@/presentation/components/bubble/bubble-activity-ring'

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
  const activityPct = bubble.prevWeeklyRecordCount > 0
    ? Math.min((bubble.weeklyRecordCount / bubble.prevWeeklyRecordCount) * 100, 100)
    : bubble.weeklyRecordCount > 0 ? 80 : 0

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(180deg, var(--accent-social-light) 0%, var(--bg) 100%)`,
      }}
    >
      {/* 배경 데코 */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-[120px] w-[120px] rounded-full opacity-20"
        style={{ backgroundColor: 'var(--accent-social)' }}
      />

      <div className="flex flex-col items-center gap-3 px-4 pb-5 pt-6">
        {/* 아이콘 + 활동 링 (더 크게) */}
        <BubbleActivityRing progress={activityPct} size={72} strokeWidth={3}>
          <div
            className="flex h-full w-full items-center justify-center rounded-2xl"
            style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
          >
            <BubbleIcon icon={bubble.icon} size={32} />
          </div>
        </BubbleActivityRing>

        {/* 이름 + 액션 버튼 */}
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-black" style={{ color: 'var(--text)' }}>{bubble.name}</span>
          <button type="button" onClick={onInfoClick} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--bg-card)' }}>
            <Info size={13} style={{ color: 'var(--text-hint)' }} />
          </button>
          {isOwner && (
            <button type="button" onClick={onSettingsClick} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--bg-card)' }}>
              <Settings size={13} style={{ color: 'var(--text-hint)' }} />
            </button>
          )}
        </div>

        {/* 설명 */}
        {bubble.description && (
          <p className="max-w-[280px] text-center text-[13px] leading-snug" style={{ color: 'var(--text-sub)' }}>
            {bubble.description}
          </p>
        )}

        {/* 멤버 아바타 스트립 + 멤버 수 */}
        <div className="flex items-center gap-2.5">
          {memberAvatars.length > 0 && (
            <div className="flex -space-x-2">
              {memberAvatars.slice(0, 5).map((m, i) => (
                <div
                  key={i}
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-[var(--bg)]"
                  style={{ backgroundColor: m.color, color: '#FFFFFF', zIndex: 5 - i }}
                >
                  {m.name.charAt(0)}
                </div>
              ))}
              {bubble.memberCount > 5 && (
                <div
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[8px] font-bold ring-2 ring-[var(--bg)]"
                  style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-sub)' }}
                >
                  +{bubble.memberCount - 5}
                </div>
              )}
            </div>
          )}
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent-social)', border: '1px solid var(--border)' }}
          >
            <Users size={12} />
            {bubble.memberCount}명
          </span>
        </div>

        {/* 뱃지 행: 취향일치도 + 초대 + 공유 */}
        <div className="flex items-center gap-2">
          {/* 취향 유사도 (게이지 포함) */}
          {tasteMatchPct !== null && (
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <Sparkles size={12} style={{ color: tasteMatchPct >= 80 ? 'var(--positive)' : 'var(--accent-social)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-sub)' }}>취향</span>
              {/* 미니 게이지 */}
              <div className="h-[5px] w-[32px] overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${tasteMatchPct}%`,
                    backgroundColor: tasteMatchPct >= 80 ? 'var(--positive)' : tasteMatchPct >= 50 ? 'var(--caution)' : 'var(--text-hint)',
                  }}
                />
              </div>
              <span
                className="text-[12px] font-bold"
                style={{ color: tasteMatchPct >= 80 ? 'var(--positive)' : 'var(--accent-social)' }}
              >
                {tasteMatchPct}%
              </span>
            </div>
          )}

          {/* 초대 */}
          {myRole && myRole !== 'follower' && (
            <button
              type="button"
              onClick={onInviteClick}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-transform active:scale-95"
              style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
            >
              <UserPlus size={12} />
              초대
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
