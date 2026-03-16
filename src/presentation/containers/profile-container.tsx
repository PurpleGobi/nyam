'use client'

import { useCallback } from 'react'
import {
  LogIn,
  LogOut,
  User,
  Shield,
  Flame,
  ClipboardCheck,
  Share2,
  Heart,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/application/hooks/use-auth'
import { useUserProfile } from '@/application/hooks/use-user-profile'
import { useFavorites } from '@/application/hooks/use-favorites'
import { EmptyState } from '@/presentation/components/shared/empty-state'
import { Button } from '@/presentation/components/ui/button'
import { Separator } from '@/presentation/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select'
import type { PreferredAi } from '@/domain/entities/user'

/** Tier labels for display */
const TIER_LABELS: Record<string, string> = {
  explorer: '탐험가',
  verifier: '검증자',
  analyst: '분석가',
  master: '마스터',
  guide: '가이드',
}

/** AI labels for display */
const AI_LABELS: Record<PreferredAi, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
}

/**
 * Profile tab container.
 * Shows user profile, stats, favorites count, settings, and logout.
 * Login prompt if not authenticated.
 */
export function ProfileContainer() {
  const { user, isLoading: authLoading, signIn, signOut } = useAuth()
  const { profile, stats, isLoading: profileLoading, error, updateProfile } =
    useUserProfile(user?.id)
  const { favorites, isLoading: favoritesLoading } = useFavorites()

  const handleAiChange = useCallback(
    (value: PreferredAi | null) => {
      if (value) {
        void updateProfile({ preferredAi: value })
      }
    },
    [updateProfile],
  )

  const handleLogout = useCallback(() => {
    void signOut()
  }, [signOut])

  // Auth loading
  if (authLoading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="h-20 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
        <div className="h-32 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <User size={64} className="text-[var(--color-neutral-300)]" />
        <h2 className="text-xl font-semibold">로그인하고 시작해보세요</h2>
        <p className="max-w-[280px] text-center text-sm text-[var(--color-neutral-500)]">
          AI 맛집 검증, 배지 수집, 즐겨찾기 등 다양한 기능을 이용할 수 있어요.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-[240px]">
          <Button onClick={() => void signIn('kakao')} variant="outline" className="w-full">
            카카오 로그인
          </Button>
          <Button onClick={() => void signIn('naver')} variant="outline" className="w-full">
            네이버 로그인
          </Button>
          <Button onClick={() => void signIn('google')} variant="outline" className="w-full">
            Google 로그인
          </Button>
        </div>
      </div>
    )
  }

  const isLoading = profileLoading

  // Profile loading
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-[var(--color-neutral-200)]" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-24 animate-pulse rounded bg-[var(--color-neutral-200)]" />
            <div className="h-4 w-16 animate-pulse rounded bg-[var(--color-neutral-100)]" />
          </div>
        </div>
        <div className="h-32 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <p className="text-sm text-[var(--color-error-500)]">
          프로필을 불러오지 못했어요.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          다시 시도
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[var(--color-neutral-200)]">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.nickname ?? '프로필'}
              className="h-full w-full object-cover"
            />
          ) : (
            <User size={32} className="text-[var(--color-neutral-400)]" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">
            {profile?.nickname ?? '맛집 탐험가'}
          </h1>
          <div className="flex items-center gap-1.5">
            <Shield size={14} className="text-[var(--color-primary-500)]" />
            <span className="text-sm text-[var(--color-primary-500)]">
              {TIER_LABELS[profile?.tier ?? 'explorer']}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Stats section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">활동 통계</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-[var(--color-neutral-200)] p-3">
            <ClipboardCheck size={20} className="text-[var(--color-primary-500)]" />
            <div className="flex flex-col">
              <span className="text-lg font-bold">
                {stats?.totalVerifications ?? 0}
              </span>
              <span className="text-xs text-[var(--color-neutral-500)]">
                총 검증
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--color-neutral-200)] p-3">
            <Flame size={20} className="text-[var(--color-warning-500)]" />
            <div className="flex flex-col">
              <span className="text-lg font-bold">
                {stats?.currentStreak ?? 0}일
              </span>
              <span className="text-xs text-[var(--color-neutral-500)]">
                연속 검증
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--color-neutral-200)] p-3">
            <Share2 size={20} className="text-[var(--color-info-500)]" />
            <div className="flex flex-col">
              <span className="text-lg font-bold">
                {stats?.promptsShared ?? 0}
              </span>
              <span className="text-xs text-[var(--color-neutral-500)]">
                프롬프트 공유
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--color-neutral-200)] p-3">
            <Heart size={20} className="text-[var(--color-error-400)]" />
            <div className="flex flex-col">
              <span className="text-lg font-bold">
                {favoritesLoading ? '-' : favorites.length}
              </span>
              <span className="text-xs text-[var(--color-neutral-500)]">
                즐겨찾기
              </span>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Settings section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">설정</h2>

        {/* Preferred AI selector */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">선호 AI</span>
            <span className="text-xs text-[var(--color-neutral-500)]">
              프롬프트 딥링크에 사용됩니다
            </span>
          </div>
          <Select
            value={profile?.preferredAi ?? 'chatgpt'}
            onValueChange={handleAiChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(AI_LABELS) as Array<[PreferredAi, string]>).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Logout */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="gap-2 text-[var(--color-error-500)]"
        >
          <LogOut size={16} />
          로그아웃
        </Button>
      </section>
    </div>
  )
}
