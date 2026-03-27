'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useRestaurantDetail } from '@/application/hooks/use-restaurant-detail'
import { useWishlist } from '@/application/hooks/use-wishlist'
import { HeroCarousel } from '@/presentation/components/detail/hero-carousel'
import { ScoreCards } from '@/presentation/components/detail/score-cards'
import { BadgeRow } from '@/presentation/components/detail/badge-row'
import { RecordTimeline } from '@/presentation/components/detail/record-timeline'
import { QuadrantDisplay } from '@/presentation/components/detail/quadrant-display'
import { RestaurantInfo } from '@/presentation/components/detail/restaurant-info'
import { DetailFab } from '@/presentation/components/detail/detail-fab'

interface RestaurantDetailContainerProps {
  restaurantId: string
}

export function RestaurantDetailContainer({ restaurantId }: RestaurantDetailContainerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { restaurant, myRecords, myAvgScore, isLoading } = useRestaurantDetail(restaurantId, user?.id ?? null)
  const { isWishlisted, toggle: toggleWishlist } = useWishlist(user?.id ?? null, restaurantId, 'restaurant')

  const quadrantPoints = myRecords
    .filter((r) => r.axisX !== null && r.axisY !== null && r.satisfaction !== null)
    .map((r) => ({
      x: r.axisX as number,
      y: r.axisY as number,
      satisfaction: r.satisfaction as number,
      name: restaurant?.name ?? '',
      score: r.satisfaction as number,
    }))

  const badges = []
  if (restaurant?.michelinStars) {
    badges.push({ icon: 'michelin' as const, label: `미슐랭 ${restaurant.michelinStars}스타`, color: '#C9A96E' })
  }
  if (restaurant?.hasBlueRibbon) {
    badges.push({ icon: 'blue_ribbon' as const, label: '블루리본', color: '#2563EB' })
  }
  if (restaurant?.mediaAppearances && restaurant.mediaAppearances.length > 0) {
    badges.push({ icon: 'media' as const, label: `TV 출연 ${restaurant.mediaAppearances.length}회` })
  }

  const handleRecordClick = useCallback(
    (recordId: string) => router.push(`/records/${recordId}`),
    [router],
  )

  const handleBack = useCallback(() => router.back(), [router])
  const handleAdd = useCallback(() => {
    router.push(`/record?type=restaurant&targetId=${restaurantId}&name=${encodeURIComponent(restaurant?.name ?? '')}&meta=${encodeURIComponent([restaurant?.genre, restaurant?.area].filter(Boolean).join(' · '))}&from=detail`)
  }, [router, restaurantId, restaurant])

  if (isLoading || !restaurant) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] pb-20">
      <DetailFab variant="food" onBack={handleBack} onAdd={handleAdd} />

      {/* L1: Hero */}
      <HeroCarousel
        photos={restaurant.photos ?? []}
        fallbackIcon="restaurant"
        isWishlisted={isWishlisted}
        onWishlistToggle={toggleWishlist}
      />

      {/* L2: Name + Meta */}
      <div className="px-4 pt-4 pb-2">
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{restaurant.name}</h1>
        <p className="mt-0.5" style={{ fontSize: '14px', color: 'var(--text-sub)' }}>
          {[restaurant.genre, restaurant.area, restaurant.priceRange ? '₩'.repeat(restaurant.priceRange) : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {/* L3: Score Cards */}
      <div className="py-3">
        <ScoreCards
          slots={[
            { label: '내 평균', value: myAvgScore },
            { label: '방문 횟수', value: myRecords.length, suffix: '회' },
            { label: 'Nyam 점수', value: restaurant.nyamScore ? Math.round(restaurant.nyamScore) : null },
          ]}
        />
      </div>

      {/* L4: Badges */}
      {badges.length > 0 && (
        <div className="py-2">
          <BadgeRow badges={badges} />
        </div>
      )}

      {/* L5: Timeline */}
      <section className="py-3">
        <h3 className="mb-2 px-4" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          내 기록
        </h3>
        <RecordTimeline records={myRecords} onRecordClick={handleRecordClick} />
      </section>

      {/* L6: Quadrant Map */}
      {quadrantPoints.length >= 2 && (
        <section className="py-3">
          <h3 className="mb-2 px-4" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            내 포지션 맵
          </h3>
          <QuadrantDisplay type="restaurant" points={quadrantPoints.slice(1)} currentPoint={quadrantPoints[0]} />
        </section>
      )}

      {/* L7: Info */}
      <section className="py-3">
        <h3 className="mb-2 px-4" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          식당 정보
        </h3>
        <RestaurantInfo restaurant={restaurant} />
      </section>
    </div>
  )
}
