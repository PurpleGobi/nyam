'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  Flame, SearchX, Sunrise, UtensilsCrossed, Sun, Moon, MoonStar,
  Briefcase, Heart, User, Home, Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/application/hooks/use-auth'
import { useRestaurants } from '@/application/hooks/use-restaurants'
import { useUserProfile } from '@/application/hooks/use-user-profile'
import { RestaurantCard } from '@/presentation/components/restaurant/restaurant-card'
import { RestaurantCardSkeleton } from '@/presentation/components/restaurant/restaurant-card-skeleton'
import { EmptyState } from '@/presentation/components/shared/empty-state'
import { SITUATION_PRESETS } from '@/shared/constants/situations'
import { ROUTES } from '@/shared/constants/routes'

/**
 * Returns a time-based Korean greeting with matching Lucide icon.
 */
function getGreeting(): { text: string; icon: LucideIcon } {
  const hour = new Date().getHours()
  if (hour < 11) return { text: '좋은 아침이에요!', icon: Sunrise }
  if (hour < 14) return { text: '점심 뭐 먹을지 고민되시죠?', icon: UtensilsCrossed }
  if (hour < 17) return { text: '오후에도 맛있는 한 끼!', icon: Sun }
  if (hour < 21) return { text: '저녁 맛집 찾고 계신가요?', icon: Moon }
  return { text: '야식이 땡기는 밤이네요!', icon: MoonStar }
}

/** Map situation icon string to Lucide component */
const situationIconMap: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  heart: Heart,
  user: User,
  home: Home,
  users: Users,
}

/**
 * Home tab container.
 * Shows greeting, situation quick buttons, recent verified restaurants,
 * and streak info for logged-in users.
 */
export function HomeContainer() {
  const { user, isLoading: authLoading } = useAuth()
  const { profile, isLoading: profileLoading } = useUserProfile(user?.id)
  const { restaurants, isLoading: restaurantsLoading, error } = useRestaurants({
    pagination: { page: 1, limit: 5 },
  })

  const { text: greetingText, icon: GreetingIcon } = useMemo(() => getGreeting(), [])

  return (
    <div className="flex flex-col gap-5 px-5 pb-20">
      {/* Greeting section */}
      <section className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <GreetingIcon size={24} strokeWidth={1.5} className="text-[var(--color-primary-500)]" />
          {greetingText}
        </h1>
        {user && !authLoading && !profileLoading && profile && (
          <p className="text-sm text-[var(--color-neutral-500)]">
            {profile.nickname ?? '맛집 탐험가'}님
            {profile.currentStreak > 0 && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Flame size={14} className="text-[var(--color-warning-500)]" />
                {profile.currentStreak}일 연속 검증 중!
              </span>
            )}
          </p>
        )}
      </section>

      {/* Situation quick buttons */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">어떤 상황인가요?</h2>
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto">
            {SITUATION_PRESETS.map((preset) => {
            const IconComp = situationIconMap[preset.icon]
            return (
              <Link
                key={preset.id}
                href={`${ROUTES.PROMPTS}?situation=${preset.id}`}
                className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--color-neutral-200)] bg-white px-3.5 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-neutral-50)]"
              >
                {IconComp && <IconComp size={16} strokeWidth={1.5} className="text-[var(--color-primary-500)]" />}
                <span>{preset.label}</span>
              </Link>
            )
          })}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-background to-transparent" />
        </div>
      </section>

      {/* Recent verified restaurants */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">최근 검증된 맛집</h2>
          <Link
            href={ROUTES.EXPLORE}
            className="text-sm text-[var(--color-primary-500)]"
          >
            더보기
          </Link>
        </div>

        {restaurantsLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <RestaurantCardSkeleton key={i} />
            ))}
          </div>
        )}

        {error && !restaurantsLoading && (
          <p className="py-8 text-center text-sm text-[var(--color-error-500)]">
            데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
          </p>
        )}

        {!restaurantsLoading && !error && restaurants.length === 0 && (
          <EmptyState
            icon={SearchX}
            title="아직 검증된 맛집이 없어요"
            description="AI로 첫 번째 맛집을 검증해보세요!"
            actionLabel="맛집 탐색하기"
            onAction={() => { window.location.href = ROUTES.EXPLORE }}
          />
        )}

        {!restaurantsLoading && !error && restaurants.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {restaurants.map((restaurant) => (
              <Link key={restaurant.id} href={`/restaurant/${restaurant.id}`}>
                <RestaurantCard restaurant={restaurant} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
