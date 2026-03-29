'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useRestaurantDetail } from '@/application/hooks/use-restaurant-detail'
import { useWishlist } from '@/application/hooks/use-wishlist'
import { restaurantRepo, wishlistRepo } from '@/shared/di/container'
import { HeroCarousel } from '@/presentation/components/detail/hero-carousel'
import { ScoreCards } from '@/presentation/components/detail/score-cards'
import { BubbleExpandPanel } from '@/presentation/components/detail/bubble-expand-panel'
import { BadgeRow } from '@/presentation/components/detail/badge-row'
import { RecordTimeline } from '@/presentation/components/detail/record-timeline'
import { QuadrantDisplay } from '@/presentation/components/detail/quadrant-display'
import { RestaurantInfo } from '@/presentation/components/detail/restaurant-info'
import { ConnectedItems } from '@/presentation/components/detail/connected-items'
import { DetailFab } from '@/presentation/components/detail/detail-fab'
import { BubbleRecordSection } from '@/presentation/components/detail/bubble-record-section'
import { AppHeader } from '@/presentation/components/layout/app-header'
import type { BadgeItem } from '@/presentation/components/detail/badge-row'

interface RestaurantDetailContainerProps {
  restaurantId: string
}


function Divider() {
  return <div style={{ height: '8px', backgroundColor: '#F0EDE8' }} />
}

export function RestaurantDetailContainer({ restaurantId }: RestaurantDetailContainerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [bubbleExpanded, setBubbleExpanded] = useState(false)

  const {
    restaurant,
    myRecords,
    recordPhotos,
    quadrantRefs,
    linkedWines,
    bubbleScores,
    isLoading,
    myAvgScore,
    visitCount,
    latestVisitDate,
    nyamScoreBreakdown,
    bubbleAvgScore,
    bubbleCount,
    viewMode,
  } = useRestaurantDetail(restaurantId, user?.id ?? null, restaurantRepo)

  const { isWishlisted, toggle: toggleWishlist } = useWishlist(
    user?.id ?? null,
    restaurantId,
    'restaurant',
    wishlistRepo,
  )

  // 뱃지 빌드
  const badges: BadgeItem[] = []
  if (restaurant?.michelinStars) {
    badges.push({ type: 'michelin', label: `미슐랭 ${restaurant.michelinStars}스타`, icon: 'star' })
  }
  if (restaurant?.hasBlueRibbon) {
    badges.push({ type: 'blue_ribbon', label: '블루리본', icon: 'award' })
  }
  if (restaurant?.mediaAppearances && restaurant.mediaAppearances.length > 0) {
    restaurant.mediaAppearances.forEach((m) => {
      badges.push({ type: 'tv', label: m.show, icon: 'tv' })
    })
  }

  // 사분면 현재 dot (이 식당 내 기록 평균)
  const recordsWithAxis = myRecords.filter(
    (r) => r.axisX !== null && r.axisY !== null && r.satisfaction !== null,
  )
  const currentDot = recordsWithAxis.length > 0
    ? {
        axisX: Math.round(recordsWithAxis.reduce((s, r) => s + r.axisX!, 0) / recordsWithAxis.length),
        axisY: Math.round(recordsWithAxis.reduce((s, r) => s + r.axisY!, 0) / recordsWithAxis.length),
        satisfaction: Math.round(recordsWithAxis.reduce((s, r) => s + r.satisfaction!, 0) / recordsWithAxis.length),
      }
    : null

  // 사분면 표시 조건: 다른 식당 리뷰 1개 이상 + 이 식당 리뷰 존재 = 총 2곳 이상
  const quadrantVisible = viewMode === 'my_records' && currentDot !== null && quadrantRefs.length >= 1

  // 연결 와인 → ConnectedItems 용 변환
  const connectedWineItems = linkedWines.map((w) => ({
    id: w.wineId,
    name: w.wineName,
    imageUrl: w.labelImageUrl,
    score: w.satisfaction,
    subText: w.wineType ?? '',
  }))

  // 콜백
  const handleRecordTap = useCallback(
    (recordId: string) => router.push(`/records/${recordId}`),
    [router],
  )
  const handleBack = useCallback(() => router.back(), [router])
  const handleAdd = useCallback(() => {
    const meta = [restaurant?.genre, restaurant?.area].filter(Boolean).join(' · ')
    router.push(
      `/record?type=restaurant&targetId=${restaurantId}&name=${encodeURIComponent(restaurant?.name ?? '')}&meta=${encodeURIComponent(meta)}&from=detail`,
    )
  }, [router, restaurantId, restaurant])
  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: restaurant?.name, url: window.location.href })
    }
  }, [restaurant])
  const handleConnectedWineTap = useCallback(
    (id: string) => router.push(`/wines/${id}`),
    [router],
  )

  // 히어로 사진: restaurant.photos 우선, 없으면 recordPhotos에서 추출
  const heroPhotos = useMemo(() => {
    if (!restaurant) return []
    const base = restaurant.photos ?? []
    if (base.length > 0) return base
    const urls: string[] = []
    recordPhotos.forEach((photos) => {
      for (const p of photos) urls.push(p.url)
    })
    return urls
  }, [restaurant, recordPhotos])

  // 로딩
  if (isLoading || !restaurant) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  // 메타 텍스트
  const metaParts = [restaurant.genre, restaurant.area]
  if (restaurant.priceRange) metaParts.push('₩'.repeat(restaurant.priceRange))
  const metaText = metaParts.filter(Boolean).join(' · ')

  // 점수 카드 텍스트
  const mySubText = visitCount > 0 ? `${visitCount}회 방문` : '미방문'
  const nyamSubText = '웹+명성'
  const bubbleSubText = bubbleCount > 0 ? `평균 · ${bubbleCount}개` : ''

  // 히어로 썸네일
  const heroThumbnail = {
    icon: 'utensils',
    name: restaurant.name,
    backgroundUrl: heroPhotos[0] ?? null,
    orientation: 'horizontal' as const,
  }

  return (
    <div className="content-detail relative min-h-dvh" style={{ backgroundColor: 'var(--bg)' }}>
      {/* 앱 헤더 (top-fixed) */}
      <AppHeader />

      {/* 스크롤 영역 */}
      <div>
        {/* L1: 히어로 캐러셀 */}
        <HeroCarousel
          photos={heroPhotos}
          fallbackIcon="restaurant"
          thumbnail={heroThumbnail}
          isWishlisted={isWishlisted}
          onWishlistToggle={toggleWishlist}
          onShare={handleShare}
        />

        {/* .detail-info 컨테이너 (L2 + L3 + 뱃지) — padding 0 20px */}
        <div>
          {/* L2: 정보 */}
          <div style={{ padding: '14px 20px 8px' }}>
            <h1 style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text)' }}>
              {restaurant.name}
            </h1>
            <p className="mt-0.5" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
              {metaText.split(' · ').map((part, i, arr) => (
                <span key={i}>
                  {restaurant.priceRange && i === arr.length - 1 ? (
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{part}</span>
                  ) : (
                    part
                  )}
                  {i < arr.length - 1 && (
                    <span style={{ fontSize: '8px', color: 'var(--border-bold)', margin: '0 5px' }}>·</span>
                  )}
                </span>
              ))}
            </p>
          </div>

          {/* L3: 점수 카드 */}
          <ScoreCards
            accentColor="--accent-food"
            myScore={myAvgScore}
            mySubText={mySubText}
            nyamScore={nyamScoreBreakdown?.finalScore ?? (restaurant.nyamScore ? Math.round(restaurant.nyamScore) : null)}
            nyamSubText={nyamSubText}
            bubbleScore={bubbleAvgScore}
            bubbleSubText={bubbleSubText}
            bubbleCount={bubbleCount}
            onBubbleCardTap={() => setBubbleExpanded(!bubbleExpanded)}
            isBubbleExpanded={bubbleExpanded}
          />

          {/* L3b: 버블 확장 패널 */}
          <BubbleExpandPanel
            isOpen={bubbleExpanded}
            bubbleScores={bubbleScores.map((b) => ({
              bubbleId: b.bubbleId,
              bubbleName: b.bubbleName,
              icon: b.bubbleIcon,
              iconBgColor: b.bubbleColor,
              ratingCount: b.memberCount,
              avgScore: b.avgScore,
            }))}
            accentColor="--accent-food"
          />

          {/* 뱃지 행 */}
          <BadgeRow badges={badges} />
        </div>

        {/* L5: 나의 기록 타임라인 */}
        <RecordTimeline
          records={myRecords}
          recordPhotos={recordPhotos}
          accentColor="--accent-food"
          sectionTitle="나의 기록"
          sectionMeta={
            visitCount > 0
              ? `방문 ${visitCount}회 · ${latestVisitDate ?? ''}`
              : ''
          }
          emptyIcon="search"
          emptyTitle="아직 방문 기록이 없어요"
          emptyDescription="우하단 + 버튼으로 첫 기록을 남겨보세요"
          onRecordTap={handleRecordTap}
        />

        <Divider />

        {/* L6: 사분면 (리뷰 2곳+만) */}
        <QuadrantDisplay
          currentName={restaurant.name}
          currentDot={currentDot}
          refDots={quadrantRefs}
          accentColor="--accent-food"
          xAxisLabels={['음식 퀄리티 ↓', '음식 퀄리티 ↑']}
          yAxisLabels={['경험 가치 ↓', '경험 가치 ↑']}
          isVisible={quadrantVisible}
          sectionTitle="내 식당 지도"
          sectionMeta="리뷰한 식당 중 위치"
        />

        {quadrantVisible && <Divider />}

        {/* L7: 실용 정보 */}
        <RestaurantInfo
          address={restaurant.address}
          lat={restaurant.lat}
          lng={restaurant.lng}
          hours={restaurant.hours}
          phone={restaurant.phone}
          menus={restaurant.menus ?? []}
          showMenuSection={viewMode === 'my_records'}
        />

        <Divider />

        {/* L8: 연결된 와인 (내 기록 모드 + 있을 때만) */}
        {viewMode === 'my_records' && connectedWineItems.length > 0 && (
          <>
            <ConnectedItems
              sectionTitle="연결된 와인"
              sectionMeta="같이 즐긴 와인"
              items={connectedWineItems}
              targetType="wine"
              onItemTap={handleConnectedWineTap}
            />
            <Divider />
          </>
        )}

        {/* L9: 버블 멤버 기록 */}
        <BubbleRecordSection targetId={restaurantId} targetType="restaurant" />

        {/* 하단 spacer (FAB 클리어런스) */}
        <div style={{ height: '80px' }} />
      </div>

      {/* FAB */}
      <DetailFab onBack={handleBack} onAdd={handleAdd} />
    </div>
  )
}
