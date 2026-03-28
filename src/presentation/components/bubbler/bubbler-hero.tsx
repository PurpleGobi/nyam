'use client'

import Image from 'next/image'
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
  tasteTags?: string[]
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
  tasteTags,
  accessLevel,
  isOwnProfile,
  isFollowLoading,
  onToggleFollow,
}: BubblerHeroProps) {
  const levelColor = getLevelColor(level)

  return (
    <div className="flex flex-col items-center px-6 pb-4 pt-6">
      {/* 아바타 72×72px + 레벨 뱃지 오버레이 */}
      <div className="relative">
        <div
          className="flex items-center justify-center rounded-full text-[28px] font-bold"
          style={{
            width: '72px',
            height: '72px',
            backgroundColor: avatarColor ?? 'var(--accent-social-light)',
            color: '#FFFFFF',
            border: `3px solid ${levelColor}`,
          }}
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={72} height={72} className="h-full w-full rounded-full object-cover" unoptimized />
          ) : (
            nickname.charAt(0)
          )}
        </div>
        <div
          className="absolute flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
          style={{
            bottom: '-2px',
            right: '-4px',
            backgroundColor: `${levelColor}20`,
            border: `1.5px solid ${levelColor}`,
          }}
        >
          <span className="text-[9px] font-bold" style={{ color: levelColor }}>Lv.{level}</span>
        </div>
      </div>

      <h1 className="mt-3 text-[18px] font-bold" style={{ color: 'var(--text)' }}>{nickname}</h1>
      {handle && (
        <span className="mt-0.5 text-[13px]" style={{ color: 'var(--text-hint)' }}>@{handle}</span>
      )}

      <span className="mt-1 text-[12px] font-medium" style={{ color: levelColor }}>{levelTitle}</span>

      {/* 취향 태그 — 앞쪽 3개 highlight */}
      {tasteTags && tasteTags.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {tasteTags.slice(0, 5).map((tag, i) => {
            const isHighlight = i < 3
            return (
              <span
                key={tag}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: isHighlight ? 'var(--accent-food-light)' : 'var(--bg-section)',
                  color: isHighlight ? 'var(--accent-food)' : 'var(--text-sub)',
                  border: isHighlight ? 'none' : '1px solid var(--border)',
                }}
              >
                {tag}
              </span>
            )
          })}
        </div>
      )}

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
