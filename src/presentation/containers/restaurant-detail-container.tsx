'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Heart,
  MapPin,
  Phone,
  Clock,
  AlertCircle,
  Sparkles,
  Star,
  Map,
  Navigation,
} from 'lucide-react'
import { useRestaurantDetail } from '@/application/hooks/use-restaurant-detail'
import { useRestaurantVerifications } from '@/application/hooks/use-verifications'
import { useFavorites } from '@/application/hooks/use-favorites'
import { useInteractionTracker } from '@/application/hooks/use-interaction-tracker'
import { TrustMeter } from '@/presentation/components/restaurant/trust-meter'
import { VerificationBadge } from '@/presentation/components/restaurant/verification-badge'
import { CategoryTag } from '@/presentation/components/restaurant/category-tag'
import { EmptyState } from '@/presentation/components/shared/empty-state'
import { PromptBridgeSheet } from '@/presentation/components/prompt/prompt-bridge-sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/utils/cn'
import { addRecentView } from '@/lib/storage'
import { buildContextFromRestaurant } from '@/shared/utils/prompt-resolver'

interface RestaurantDetailContainerProps {
  id: string
}

/**
 * Formats a date string to a relative Korean time string.
 */
function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  return `${Math.floor(days / 30)}개월 전`
}

/**
 * Formats score from 0-100 to a display value (e.g., 85 -> "8.5").
 */
function formatScore(score: number | null): string {
  if (score === null) return '-'
  return (score / 10).toFixed(1)
}

/**
 * Restaurant detail page container.
 * Displays restaurant info, trust meter, verifications, and CTA.
 */
export function RestaurantDetailContainer({ id }: RestaurantDetailContainerProps) {
  const { restaurant, isLoading: detailLoading, error: detailError } = useRestaurantDetail(id)
  const {
    verifications,
    isLoading: verificationsLoading,
    error: verificationsError,
  } = useRestaurantVerifications(id)
  const { isFavorite, toggleFavorite } = useFavorites()
  const { trackRestaurantView } = useInteractionTracker()

  const isLoading = detailLoading
  const error = detailError

  // Track recent view
  useEffect(() => {
    if (restaurant) {
      addRecentView(restaurant.id)
      trackRestaurantView(
        restaurant.id,
        restaurant.cuisineCategory,
        restaurant.region ?? restaurant.shortAddress ?? '',
      )
    }
  }, [restaurant, trackRestaurantView])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-5 pb-20">
        <div className="h-8 w-24 animate-pulse rounded bg-[var(--color-neutral-200)]" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-[var(--color-neutral-200)]" />
        <div className="h-48 animate-pulse rounded-xl bg-[var(--color-neutral-200)]" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-[var(--color-neutral-100)]" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !restaurant) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-20">
        <AlertCircle size={48} className="text-[var(--color-error-400)]" />
        <p className="text-sm text-[var(--color-error-500)]">
          {error?.message ?? '맛집 정보를 찾을 수 없어요.'}
        </p>
        <Link
          href={ROUTES.EXPLORE}
          className="rounded-md bg-[var(--color-primary-500)] px-4 py-2 text-sm font-medium text-white"
        >
          맛집 탐색으로 돌아가기
        </Link>
      </div>
    )
  }

  const favorited = isFavorite(restaurant.id)

  return (
    <div className="flex flex-col gap-6 px-5 pb-24">
      {/* Header with back button and favorite */}
      <div className="flex items-center justify-between">
        <Link
          href={ROUTES.EXPLORE}
          className="flex items-center gap-1 text-sm text-[var(--color-neutral-500)]"
        >
          <ArrowLeft size={18} />
          뒤로
        </Link>
        <button
          type="button"
          onClick={() => void toggleFavorite(restaurant.id)}
          className="p-2"
          aria-label={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          <Heart
            size={22}
            className={cn(
              favorited
                ? 'fill-[var(--color-error-500)] text-[var(--color-error-500)]'
                : 'text-[var(--color-neutral-400)]',
            )}
          />
        </button>
      </div>

      {/* Restaurant name and category */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          <VerificationBadge
            level={restaurant.verificationLevel}
            count={restaurant.verificationCount}
            size="md"
          />
        </div>
        <div className="flex items-center gap-2">
          <CategoryTag category={restaurant.cuisineCategory} />
          {restaurant.priceRange && (
            <span className="text-sm text-[var(--color-neutral-500)]">
              {restaurant.priceRange}
            </span>
          )}
        </div>
      </div>

      {/* Trust Meter */}
      {restaurant.avgTaste !== null && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">AI 검증 점수</h2>
          <TrustMeter
            taste={restaurant.avgTaste ?? 0}
            value={restaurant.avgValue ?? 0}
            service={restaurant.avgService ?? 0}
            ambiance={restaurant.avgAmbiance ?? 0}
            animated
          />
        </section>
      )}

      <Separator />

      {/* Restaurant info */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">매장 정보</h2>
        <div className="flex flex-col gap-2 text-sm text-[var(--color-neutral-600)]">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            <span>{restaurant.address}</span>
          </div>
          {restaurant.phone && (
            <div className="flex items-center gap-2">
              <Phone size={16} className="shrink-0" />
              <a href={`tel:${restaurant.phone}`} className="underline">
                {restaurant.phone}
              </a>
            </div>
          )}
          {restaurant.hours && (
            <div className="flex items-start gap-2">
              <Clock size={16} className="mt-0.5 shrink-0" />
              <div className="flex flex-col">
                {Object.entries(restaurant.hours).map(([day, hours]) => (
                  <span key={day}>
                    {day}: {hours}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map deeplinks */}
        <div className="flex gap-2">
          <a
            href={`https://map.naver.com/v5/search/${encodeURIComponent(restaurant.name + ' ' + (restaurant.shortAddress ?? ''))}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)]',
              'border border-[var(--color-neutral-200)] bg-white px-4 py-2.5',
              'text-sm font-medium text-[var(--color-neutral-700)]',
              'transition-colors hover:bg-[var(--color-neutral-50)]',
            )}
          >
            <Map size={16} strokeWidth={1.5} />
            네이버 지도
          </a>
          <a
            href={`https://map.kakao.com/?q=${encodeURIComponent(restaurant.name + ' ' + (restaurant.shortAddress ?? ''))}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)]',
              'border border-[var(--color-neutral-200)] bg-white px-4 py-2.5',
              'text-sm font-medium text-[var(--color-neutral-700)]',
              'transition-colors hover:bg-[var(--color-neutral-50)]',
            )}
          >
            <Navigation size={16} strokeWidth={1.5} />
            카카오맵
          </a>
        </div>
      </section>

      <Separator />

      {/* Verifications list */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          검증 기록 ({verifications.length})
        </h2>

        {verificationsLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-[var(--color-neutral-100)]"
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
            icon={Star}
            title="아직 검증 기록이 없어요"
            description="AI로 이 맛집을 첫 번째로 검증해보세요!"
          />
        )}

        {!verificationsLoading && verifications.length > 0 && (
          <div className="flex flex-col gap-3">
            {verifications.slice(0, 10).map((v) => (
              <div
                key={v.id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--color-neutral-200)] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-neutral-700)]">
                    {v.aiModel ?? 'AI'} 검증
                  </span>
                  <span className="text-xs text-[var(--color-neutral-400)]">
                    {formatRelativeDate(v.createdAt)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-[var(--color-neutral-500)]">
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

      {/* CTA button - opens prompt bridge sheet */}
      <div className="sticky bottom-24">
        <PromptBridgeSheet
          context={buildContextFromRestaurant(restaurant)}
          restaurantId={restaurant.id}
        >
          <Button className="w-full gap-2" size="lg">
            <Sparkles size={18} />
            AI 검증하기
          </Button>
        </PromptBridgeSheet>
      </div>
    </div>
  )
}
