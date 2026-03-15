'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Flame, Sunrise, UtensilsCrossed, Sun, Moon, MoonStar,
  Briefcase, Heart, User, Home, Users, MapPin, ChevronRight,
  RotateCcw, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/application/hooks/use-auth'
import { useUserProfile } from '@/application/hooks/use-user-profile'
import { useHomeRecommendations } from '@/application/hooks/use-home-recommendations'
import { useInteractionTracker } from '@/application/hooks/use-interaction-tracker'
import { RestaurantCard } from '@/presentation/components/restaurant/restaurant-card'
import { RestaurantCardSkeleton } from '@/presentation/components/restaurant/restaurant-card-skeleton'
import { QuickPickCard } from '@/presentation/components/home/quick-pick-card'
import { SmartFilterBar } from '@/presentation/components/home/smart-filter-bar'
import { SITUATION_PRESETS, resolvePresetLabel } from '@/shared/constants/situations'
import { FOOD_CATEGORIES } from '@/shared/constants/categories'
import { ROUTES } from '@/shared/constants/routes'
import type { CuisineCategory } from '@/domain/entities/restaurant'
import { cn } from '@/shared/utils/cn'

const REGIONS = ['강남', '홍대', '종로', '이태원', '성수', '여의도', '잠실', '신촌', '망원', '을지로', '광화문']
const PARTY_SIZES = ['1명', '2명', '3~4명', '5~6명', '7명 이상']
const BUDGETS = ['1만원 이하', '1~2만원', '2~3만원', '3~5만원', '5만원 이상']

const categoryIdToLabel: Record<string, CuisineCategory> = {
  korean: '한식', japanese: '일식', chinese: '중식', western: '양식',
  'cafe-dessert': '카페', 'southeast-asian': '아시안', 'street-food': '분식',
  'meat-grill': '기타', seafood: '기타', 'vegetarian-healthy': '기타',
}

function getGreeting(): { text: string; icon: LucideIcon } {
  const hour = new Date().getHours()
  if (hour < 11) return { text: '좋은 아침이에요!', icon: Sunrise }
  if (hour < 14) return { text: '점심 뭐 먹을지 고민되시죠?', icon: UtensilsCrossed }
  if (hour < 17) return { text: '오후에도 맛있는 한 끼!', icon: Sun }
  if (hour < 21) return { text: '저녁 맛집 찾고 계신가요?', icon: Moon }
  return { text: '야식이 땡기는 밤이네요!', icon: MoonStar }
}

const situationIconMap: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  heart: Heart,
  user: User,
  home: Home,
  users: Users,
}

export function HomeContainer() {
  const { user, isLoading: authLoading } = useAuth()
  const { profile, isLoading: profileLoading } = useUserProfile(user?.id)
  const {
    restaurants,
    mealLabel,
    detectedRegion,
    filter,
    setFilter,
    resetFilters,
    quickPick,
    smartDefaultsApplied,
    isLoading: recommendLoading,
    error: recommendError,
  } = useHomeRecommendations()

  const { trackSituationClick } = useInteractionTracker()
  const [showFilters, setShowFilters] = useState(false)

  const { text: greetingText, icon: GreetingIcon } = useMemo(() => getGreeting(), [])

  const activeFilterCount = [
    filter.situation,
    filter.cuisineCategory,
    filter.partySize,
    filter.budget,
  ].filter(Boolean).length

  const handleSituationToggle = (presetId: string) => {
    setFilter('situation', filter.situation === presetId ? null : presetId)
    if (filter.situation !== presetId) {
      const preset = SITUATION_PRESETS.find(p => p.id === presetId)
      if (preset) trackSituationClick(presetId, resolvePresetLabel(preset))
    }
  }

  const handleRegionToggle = (region: string) => {
    setFilter('region', filter.region === region ? null : region)
  }

  const handleCuisineToggle = (categoryId: string) => {
    const label = categoryIdToLabel[categoryId] ?? null
    setFilter('cuisineCategory', filter.cuisineCategory === label ? null : label)
  }

  const handlePartySizeToggle = (size: string) => {
    setFilter('partySize', filter.partySize === size ? null : size)
  }

  const handleBudgetToggle = (budget: string) => {
    setFilter('budget', filter.budget === budget ? null : budget)
  }

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
        {smartDefaultsApplied && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--color-primary-50)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary-600)]">
            <Sparkles size={12} />
            맞춤 추천
          </span>
        )}
      </section>

      {/* Smart Filter Bar - compact summary, tap to expand */}
      <SmartFilterBar
        region={filter.region}
        cuisineCategory={filter.cuisineCategory}
        situation={filter.situation ? (SITUATION_PRESETS.find(p => p.id === filter.situation) ? resolvePresetLabel(SITUATION_PRESETS.find(p => p.id === filter.situation)!) : filter.situation) : null}
        partySize={filter.partySize}
        budget={filter.budget}
        expanded={showFilters}
        onToggle={() => setShowFilters(!showFilters)}
        onClearFilter={(key) => {
          if (key === 'situation') setFilter('situation', null)
          else if (key === 'region') setFilter('region', null)
          else if (key === 'cuisineCategory') setFilter('cuisineCategory', null)
          else if (key === 'partySize') setFilter('partySize', null)
          else if (key === 'budget') setFilter('budget', null)
        }}
      />

      {/* Expandable filter panel */}
      {showFilters && (
        <section className="flex flex-col gap-3 rounded-2xl bg-[var(--color-neutral-50)] p-4">
          {/* Situation chips */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--color-neutral-500)]">상황</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {SITUATION_PRESETS.map((preset) => {
                const IconComp = situationIconMap[preset.icon]
                const isActive = filter.situation === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSituationToggle(preset.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
                      isActive
                        ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                        : 'bg-white text-[var(--color-neutral-600)] border border-[var(--color-neutral-200)]',
                    )}
                  >
                    {IconComp && <IconComp size={14} strokeWidth={1.5} />}
                    {resolvePresetLabel(preset)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Region chips */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--color-neutral-500)]">
              지역
              {detectedRegion && filter.region === detectedRegion && (
                <span className="ml-1 text-[var(--color-primary-500)]">(현재 위치)</span>
              )}
            </span>
            <div className="flex gap-1.5 overflow-x-auto">
              {detectedRegion && !REGIONS.includes(detectedRegion) && (
                <button
                  type="button"
                  onClick={() => handleRegionToggle(detectedRegion)}
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
                    filter.region === detectedRegion
                      ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                      : 'bg-white text-[var(--color-neutral-600)] border border-[var(--color-neutral-200)]',
                  )}
                >
                  <MapPin size={12} />
                  {detectedRegion}
                </button>
              )}
              {REGIONS.map(region => (
                <button
                  key={region}
                  type="button"
                  onClick={() => handleRegionToggle(region)}
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
                    filter.region === region
                      ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                      : 'bg-white text-[var(--color-neutral-600)] border border-[var(--color-neutral-200)]',
                    region === detectedRegion && filter.region !== region && 'border-[var(--color-primary-200)] bg-[var(--color-primary-50)]',
                  )}
                >
                  {region === detectedRegion && <MapPin size={12} />}
                  {region}
                </button>
              ))}
            </div>
          </div>

          {/* Cuisine category chips */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--color-neutral-500)]">음식 종류</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {FOOD_CATEGORIES.slice(0, 7).map(category => {
                const label = categoryIdToLabel[category.id]
                const isActive = filter.cuisineCategory === label
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCuisineToggle(category.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
                      isActive
                        ? 'text-white shadow-sm'
                        : 'bg-white text-[var(--color-neutral-600)] border border-[var(--color-neutral-200)]',
                    )}
                    style={isActive ? { backgroundColor: category.color } : undefined}
                  >
                    <category.icon size={13} />
                    {category.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Party size */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--color-neutral-500)]">인원</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {PARTY_SIZES.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePartySizeToggle(size)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
                    filter.partySize === size
                      ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                      : 'bg-white text-[var(--color-neutral-600)] border border-[var(--color-neutral-200)]',
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--color-neutral-500)]">예산 (1인)</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {BUDGETS.map(budget => (
                <button
                  key={budget}
                  type="button"
                  onClick={() => handleBudgetToggle(budget)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
                    filter.budget === budget
                      ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                      : 'bg-white text-[var(--color-neutral-600)] border border-[var(--color-neutral-200)]',
                  )}
                >
                  {budget}
                </button>
              ))}
            </div>
          </div>

          {/* Reset filters */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-700)]"
            >
              <RotateCcw size={12} />
              필터 초기화
            </button>
          )}
        </section>
      )}

      {/* Time + location based recommendations */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {mealLabel || '지금 이 시간 추천'}
            </h2>
            {filter.region && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-50)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary-600)]">
                <MapPin size={10} strokeWidth={2} />
                {filter.region}
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
            {quickPick && (
              <Link href={`/restaurant/${quickPick.restaurant.id}`}>
                <QuickPickCard quickPick={quickPick} />
              </Link>
            )}
            {restaurants
              .filter(r => r.id !== quickPick?.restaurant.id)
              .map((restaurant) => (
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
