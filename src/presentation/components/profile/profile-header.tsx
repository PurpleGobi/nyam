'use client'

import { Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/domain/entities/profile'

interface ProfileHeaderProps {
  profile: UserProfile
  level: number
  levelColor: string
}

export function ProfileHeader({ profile, level, levelColor }: ProfileHeaderProps) {
  const router = useRouter()

  return (
    <div className="px-4 py-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* 아바타 64px */}
          <div className="relative">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: profile.avatarColor ?? 'var(--accent-food)' }}
            >
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF' }}>
                  {profile.nickname[0]}
                </span>
              )}
            </div>
            {/* Lv.N 뱃지 (우하단) */}
            <span
              className="absolute -bottom-0.5 -right-0.5 rounded-full px-1.5 py-0.5"
              style={{ fontSize: '10px', fontWeight: 700, backgroundColor: levelColor, color: '#FFFFFF' }}
            >
              Lv.{level}
            </span>
          </div>

          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{profile.nickname}</h1>
            {profile.handle && <p style={{ fontSize: '13px', color: 'var(--text-hint)' }}>@{profile.handle}</p>}
          </div>
        </div>

        <button type="button" onClick={() => router.push('/settings')} className="flex h-10 w-10 items-center justify-center">
          <Settings size={20} style={{ color: 'var(--text-sub)' }} />
        </button>
      </div>

      {profile.bio && <p className="mt-3" style={{ fontSize: '14px', color: 'var(--text-sub)', lineHeight: 1.5 }}>{profile.bio}</p>}
    </div>
  )
}
