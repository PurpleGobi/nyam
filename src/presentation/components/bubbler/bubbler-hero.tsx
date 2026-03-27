'use client'

import { FollowButton } from '@/presentation/components/follow/follow-button'
import { getLevelColor } from '@/domain/services/xp-calculator'
import type { AccessLevel } from '@/domain/entities/follow'

interface BubblerHeroProps {
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  level: number
  levelTitle: string
  accessLevel: AccessLevel
  isOwnProfile: boolean
  isFollowLoading: boolean
  onToggleFollow: () => void
}

export function BubblerHero({
  nickname,
  handle,
  avatarUrl,
  avatarColor,
  level,
  levelTitle,
  accessLevel,
  isOwnProfile,
  isFollowLoading,
  onToggleFollow,
}: BubblerHeroProps) {
  const levelColor = getLevelColor(level)

  return (
    <div className="flex flex-col items-center px-6 pb-4 pt-6">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full text-[28px] font-bold"
        style={{
          backgroundColor: avatarColor ?? 'var(--accent-social-light)',
          color: '#FFFFFF',
          border: `3px solid ${levelColor}`,
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          nickname.charAt(0)
        )}
      </div>

      <h1 className="mt-3 text-[18px] font-bold" style={{ color: 'var(--text)' }}>{nickname}</h1>
      {handle && (
        <span className="mt-0.5 text-[13px]" style={{ color: 'var(--text-hint)' }}>@{handle}</span>
      )}

      <div
        className="mt-2 flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
        style={{ backgroundColor: `${levelColor}20` }}
      >
        <span className="text-[11px] font-bold" style={{ color: levelColor }}>Lv.{level}</span>
        <span className="text-[11px] font-medium" style={{ color: levelColor }}>{levelTitle}</span>
      </div>

      {!isOwnProfile && (
        <div className="mt-4">
          <FollowButton
            accessLevel={accessLevel}
            onToggle={onToggleFollow}
            isLoading={isFollowLoading}
          />
        </div>
      )}
    </div>
  )
}
