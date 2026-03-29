'use client'

import Image from 'next/image'
import type { UserProfile } from '@/domain/entities/profile'

interface ProfileHeaderProps {
  profile: UserProfile
  level: number
  levelColor: string
  tasteSummary?: string | null
  tasteTags?: string[] | null
  recordCount?: number
  onSharePress?: () => void
}

export function ProfileHeader({ profile, level, levelColor, tasteSummary, tasteTags, recordCount, onSharePress }: ProfileHeaderProps) {
  return (
    <div className="px-4 py-5">
      <div className="flex items-start gap-4">
        {/* 좌측: 아바타 + 이름 */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: profile.avatarColor ?? 'var(--accent-food)' }}
            >
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt="" width={64} height={64} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF' }}>
                  {profile.nickname[0]}
                </span>
              )}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 rounded-full px-1.5 py-0.5"
              style={{ fontSize: '10px', fontWeight: 700, backgroundColor: levelColor, color: '#FFFFFF' }}
            >
              Lv.{level}
            </span>
          </div>
          <div className="text-center">
            <h1 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{profile.nickname}</h1>
            {profile.handle && <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>@{profile.handle}</p>}
          </div>
        </div>

        {/* 우측: 미식 정체성 카드 */}
        <div
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3"
          style={{ background: 'linear-gradient(135deg, #FEFCFA, #F5EDE8)' }}
        >
          {tasteSummary ? (
            <p
              className="line-clamp-3"
              style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text)' }}
            >
              {tasteSummary}
            </p>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-hint)' }}>
              기록을 쌓으면 미식 정체성이 생성됩니다
            </p>
          )}
          {tasteTags && tasteTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tasteTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2 py-0.5"
                  style={{ fontSize: '10px', fontWeight: 600, backgroundColor: 'rgba(193,123,94,0.1)', color: 'var(--accent-food)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>
              {recordCount != null && recordCount > 0 ? `✨ ${recordCount}개 기록 기반` : ''}
            </span>
            {onSharePress && (
              <button
                type="button"
                onClick={onSharePress}
                style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent-food)' }}
              >
                공유
              </button>
            )}
          </div>
        </div>
      </div>

      {profile.bio && <p className="mt-3" style={{ fontSize: '14px', color: 'var(--text-sub)', lineHeight: 1.5 }}>{profile.bio}</p>}
    </div>
  )
}
