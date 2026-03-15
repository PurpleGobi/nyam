'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  Flame, Sunrise, UtensilsCrossed, Sun, Moon, MoonStar,
  Briefcase, Heart, User, Home, Users, MapPin, ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/application/hooks/use-auth'
import { useUserProfile } from '@/application/hooks/use-user-profile'
import { useHomeRecommendations } from '@/application/hooks/use-home-recommendations'
import { RestaurantCard } from '@/presentation/components/restaurant/restaurant-card'
import { RestaurantCardSkeleton } from '@/presentation/components/restaurant/restaurant-card-skeleton'
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
 * Shows greeting, situation quick buttons, and time+location based recommendations.
 */
export function HomeContainer() {
  const { user, isLoading: authLoading } = useAuth()
  const { profile, isLoading: profileLoading } = useUserProfile(user?.id)
  const {
    restaurants,
    mealLabel,
    region,
    isLoading: recommendLoading,
    error: recommendError,
  } = useHomeRecommendations()

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

      {/* Time + location based recommendations */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {mealLabel || '지금 이 시간 추천'}
            </h2>
            {region && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-50)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary-600)]">
                <MapPin size={10} strokeWidth={2} />
                {region}
              </span>
            )}
          </div>
          <Link
            href={ROUTES.EXPLORE}
            className="flex items-center gap-0.5 text-sm text-[var(--color-primary-500)]"
          >
            더보기
            <ChevronRight size={14} />
          </Link>
        </div>

        {recommendLoading && (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <RestaurantCardSkeleton key={i} />
            ))}
          </div>
        )}

        {recommendError && !recommendLoading && (
          <div className="rounded-xl bg-[var(--color-neutral-50)] px-4 py-8 text-center">
            <p className="text-sm text-[var(--color-neutral-500)]">
              추천 맛집을 불러오지 못했어요.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-[var(--color-primary-500)] px-4 py-2 text-sm font-medium text-white"
            >
              다시 시도
            </button>
          </div>
        )}

        {!recommendLoading && !recommendError && restaurants.length === 0 && (
          <div className="rounded-xl bg-[var(--color-neutral-50)] px-4 py-10 text-center">
            <UtensilsCrossed size={36} className="mx-auto mb-3 text-[var(--color-neutral-300)]" />
            <p className="text-sm font-medium text-[var(--color-neutral-600)]">
              주변 맛집을 검색하려면 API 키 설정이 필요해요
            </p>
            <p className="mt-1 text-xs text-[var(--color-neutral-400)]">
              docs/api-keys-guide.md를 참고해주세요
            </p>
            <Link
              href={ROUTES.EXPLORE}
              className="mt-4 inline-block rounded-lg bg-[var(--color-primary-500)] px-5 py-2.5 text-sm font-medium text-white"
            >
              직접 탐색하기
            </Link>
          </div>
        )}

        {!recommendLoading && !recommendError && restaurants.length > 0 && (
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
