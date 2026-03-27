'use client'

import { Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { LevelInfo } from '@/domain/entities/xp'

interface ProfileHeaderProps {
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  bio: string | null
  level: LevelInfo | null
  recordCount: number
  followerCount: number
  followingCount: number
}

export function ProfileHeader({
  nickname, handle, avatarUrl, avatarColor, bio,
  level, recordCount, followerCount, followingCount,
}: ProfileHeaderProps) {
  const router = useRouter()

  return (
    <div className="px-4 py-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* 아바타 */}
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: avatarColor ?? 'var(--accent-food)' }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF' }}>
                {nickname[0]}
              </span>
            )}
          </div>

          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{nickname}</h1>
            {handle && <p style={{ fontSize: '13px', color: 'var(--text-hint)' }}>@{handle}</p>}
            {level && (
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{ fontSize: '11px', fontWeight: 700, backgroundColor: `${level.color}20`, color: level.color }}
                >
                  Lv.{level.level} {level.title}
                </span>
              </div>
            )}
          </div>
        </div>

        <button type="button" onClick={() => router.push('/settings')} className="flex h-10 w-10 items-center justify-center">
          <Settings size={20} style={{ color: 'var(--text-sub)' }} />
        </button>
      </div>

      {bio && <p className="mt-3" style={{ fontSize: '14px', color: 'var(--text-sub)', lineHeight: 1.5 }}>{bio}</p>}

      {/* 통계 */}
      <div className="mt-4 flex gap-6">
        <div className="text-center">
          <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>{recordCount}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>기록</p>
        </div>
        <div className="text-center">
          <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>{followerCount}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>팔로워</p>
        </div>
        <div className="text-center">
          <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>{followingCount}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>팔로잉</p>
        </div>
      </div>
    </div>
  )
}
