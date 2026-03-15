'use client'

import { ClipboardList, Award, LogIn } from 'lucide-react'
import { useAuth } from '@/application/hooks/use-auth'
import { useMyVerifications } from '@/application/hooks/use-verifications'
import { useMyBadges } from '@/application/hooks/use-badges'
import { BadgeCard } from '@/presentation/components/badge/badge-card'
import { EmptyState } from '@/presentation/components/shared/empty-state'
import { Button } from '@/presentation/components/ui/button'
import { Separator } from '@/presentation/components/ui/separator'
import { ROUTES } from '@/shared/constants/routes'

/**
 * Formats a date string for verification list display.
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Formats score from 0-100 to display value.
 */
function formatScore(score: number | null): string {
  if (score === null) return '-'
  return (score / 10).toFixed(1)
}

/**
 * Activity tab container.
 * Shows user's verifications and earned badges.
 * Requires authentication - shows login prompt if not logged in.
 */
export function ActivityContainer() {
  const { user, isLoading: authLoading, signIn } = useAuth()
  const {
    verifications,
    isLoading: verificationsLoading,
    error: verificationsError,
  } = useMyVerifications()
  const {
    earnedBadges,
    isLoading: badgesLoading,
    error: badgesError,
  } = useMyBadges()

  // Auth loading
  if (authLoading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="h-8 w-32 animate-pulse rounded bg-[var(--color-neutral-200)]" />
        <div className="h-48 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <LogIn size={48} className="text-[var(--color-neutral-300)]" />
        <h2 className="text-xl font-semibold">로그인이 필요해요</h2>
        <p className="text-center text-sm text-[var(--color-neutral-500)]">
          내 검증 기록과 배지를 확인하려면 로그인해주세요.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => void signIn('kakao')} variant="outline">
            카카오 로그인
          </Button>
          <Button onClick={() => void signIn('google')} variant="outline">
            Google 로그인
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <h1 className="text-2xl font-bold">내 활동</h1>

      {/* My Verifications */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          검증 기록 ({verifications.length})
        </h2>

        {verificationsLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-[var(--color-neutral-100)]"
              />
            ))}
          </div>
        )}

        {verificationsError && !verificationsLoading && (
          <p className="py-4 text-center text-sm text-[var(--color-error-500)]">
            검증 기록을 불러오지 못했어요.
          </p>
        )}

        {!verificationsLoading && !verificationsError && verifications.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="아직 검증 기록이 없어요"
            description="AI 프롬프트로 맛집을 검증해보세요!"
            actionLabel="프롬프트 보기"
            onAction={() => { window.location.href = ROUTES.PROMPTS }}
          />
        )}

        {!verificationsLoading && verifications.length > 0 && (
          <div className="flex flex-col gap-2">
            {verifications.map((v) => (
              <div
                key={v.id}
                className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-neutral-200)] p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {v.aiModel ?? 'AI'} 검증
                  </span>
                  <span className="text-xs text-[var(--color-neutral-400)]">
                    {formatDate(v.createdAt)}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-[var(--color-neutral-500)]">
                  <span>맛 {formatScore(v.tasteScore)}</span>
                  <span>가성비 {formatScore(v.valueScore)}</span>
                  <span>서비스 {formatScore(v.serviceScore)}</span>
                  <span>분위기 {formatScore(v.ambianceScore)}</span>
                </div>
                {v.comment && (
                  <p className="text-sm text-[var(--color-neutral-600)]">
                    {v.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* My Badges */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          내 배지 ({earnedBadges.filter((b) => b.earned).length})
        </h2>

        {badgesLoading && (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg bg-[var(--color-neutral-100)]"
              />
            ))}
          </div>
        )}

        {badgesError && !badgesLoading && (
          <p className="py-4 text-center text-sm text-[var(--color-error-500)]">
            배지를 불러오지 못했어요.
          </p>
        )}

        {!badgesLoading && !badgesError && earnedBadges.length === 0 && (
          <EmptyState
            icon={Award}
            title="아직 획득한 배지가 없어요"
            description="맛집을 검증하면 배지를 획득할 수 있어요!"
          />
        )}

        {!badgesLoading && earnedBadges.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {earnedBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                earned={badge.earned}
                earnedAt={badge.earnedAt ? new Date(badge.earnedAt) : null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
