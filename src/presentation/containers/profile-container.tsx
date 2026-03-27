'use client'

import { useAuth } from '@/presentation/providers/auth-provider'
import { useProfile } from '@/application/hooks/use-profile'
import { useXp } from '@/application/hooks/use-xp'
import { ProfileHeader } from '@/presentation/components/profile/profile-header'
import { TasteIdentityCard } from '@/presentation/components/profile/taste-identity-card'

export function ProfileContainer() {
  const { user: authUser } = useAuth()
  const { user, isLoading: profileLoading } = useProfile(authUser?.id ?? null)
  const { levelInfo, isLoading: xpLoading } = useXp(authUser?.id ?? null)

  if (profileLoading || xpLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p style={{ color: 'var(--text-hint)' }}>로그인이 필요합니다</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] pb-20">
      <ProfileHeader
        nickname={user.nickname}
        handle={user.handle ?? null}
        avatarUrl={user.avatar_url ?? null}
        avatarColor={user.avatar_color ?? null}
        bio={user.bio ?? null}
        level={levelInfo}
        recordCount={user.record_count}
        followerCount={user.follower_count}
        followingCount={user.following_count}
      />

      <TasteIdentityCard
        tasteSummary={user.taste_summary ?? null}
        tasteTags={user.taste_tags ?? null}
        recordCount={user.record_count}
      />
    </div>
  )
}
