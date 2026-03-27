'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import type { User } from '@/domain/entities/user'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useFollow } from '@/application/hooks/use-follow'
import { FollowButton } from '@/presentation/components/follow/follow-button'
import { getSupabaseClient } from '@/shared/di/container'

interface BubblerProfileContainerProps {
  userId: string
}

export function BubblerProfileContainer({ userId }: BubblerProfileContainerProps) {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const { accessLevel, isLoading: followLoading, toggleFollow } = useFollow(authUser?.id ?? null, userId)
  const [profile, setProfile] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.from('users').select('*').eq('id', userId).single().then(({ data }) => {
      if (data) setProfile(data as unknown as User)
      setIsLoading(false)
    })
  }, [userId])

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  const isSelf = authUser?.id === userId

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <nav className="flex items-center justify-between px-4" style={{ height: '44px' }}>
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{profile.nickname}</span>
        <div className="w-11" />
      </nav>

      <div className="px-4 py-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: profile.avatar_color ?? 'var(--accent-social)' }}
          >
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF' }}>{profile.nickname[0]}</span>
          </div>
          <div className="flex-1">
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{profile.nickname}</h1>
            {profile.handle && <p style={{ fontSize: '13px', color: 'var(--text-hint)' }}>@{profile.handle}</p>}
          </div>
          {!isSelf && (
            <FollowButton accessLevel={accessLevel} onToggle={toggleFollow} isLoading={followLoading} />
          )}
        </div>

        {profile.bio && (
          <p className="mt-3" style={{ fontSize: '14px', color: 'var(--text-sub)', lineHeight: 1.5 }}>{profile.bio}</p>
        )}

        <div className="mt-4 flex gap-6">
          <div className="text-center">
            <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>{profile.record_count}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>기록</p>
          </div>
          <div className="text-center">
            <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>{profile.follower_count}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>팔로워</p>
          </div>
          <div className="text-center">
            <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>{profile.following_count}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>팔로잉</p>
          </div>
        </div>
      </div>

      {accessLevel === 'none' && (
        <div className="flex flex-col items-center py-12">
          <p style={{ fontSize: '14px', color: 'var(--text-hint)' }}>팔로우하면 더 많은 정보를 볼 수 있어요</p>
        </div>
      )}
    </div>
  )
}
