'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useWineDetail } from '@/application/hooks/use-wine-detail'
import { useWishlist } from '@/application/hooks/use-wishlist'
import { wineRepo, wishlistRepo } from '@/shared/di/container'
import { HeroCarousel } from '@/presentation/components/detail/hero-carousel'
import { ScoreCards } from '@/presentation/components/detail/score-cards'
import { BubbleExpandPanel } from '@/presentation/components/detail/bubble-expand-panel'
import { BadgeRow } from '@/presentation/components/detail/badge-row'
import { RecordTimeline } from '@/presentation/components/detail/record-timeline'
import { QuadrantDisplay } from '@/presentation/components/detail/quadrant-display'
import { ConnectedItems } from '@/presentation/components/detail/connected-items'
import { DetailFab } from '@/presentation/components/detail/detail-fab'
import { BubbleRecordSection } from '@/presentation/components/detail/bubble-record-section'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { WineTypeChip } from '@/presentation/components/detail/wine-type-chip'
import { WineFactsTable } from '@/presentation/components/detail/wine-facts-table'
import { FoodPairingTags } from '@/presentation/components/detail/food-pairing-tags'
import { WINE_TYPE_LABELS } from '@/domain/entities/wine'
import type { BadgeItem } from '@/presentation/components/detail/badge-row'

interface WineDetailContainerProps {
  wineId: string
}

const FROM_LABELS: Record<string, string> = {
  home: '홈',
  profile: '프로필',
  bubble: '버블',
  search: '검색',
  recommend: '추천',
  record: '기록',
  camera: '카메라',
  detail: '상세',
}

function Divider() {
  return <div style={{ height: '8px', backgroundColor: '#F0EDE8' }} />
}

export function WineDetailContainer({ wineId }: WineDetailContainerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? 'home'
  const { user } = useAuth()
  const [bubbleExpanded, setBubbleExpanded] = useState(false)

  const {
    wine,
    myRecords,
    recordPhotos,
    quadrantRefs,
    linkedRestaurants,
    bubbleScores,
    isLoading,
    myAvgScore,
    tastingCount,
    latestTastingDate,
    nyamScoreBreakdown,
    bubbleAvgScore,
    bubbleCount,
    viewMode,
  } = useWineDetail(wineId, user?.id ?? null, wineRepo)

  const { isWishlisted, toggle: toggleWishlist } = useWishlist(
    user?.id ?? null,
    wineId,
    'wine',
    wishlistRepo,
  )

  // 뱃지 빌드 (와인)
  const badges: BadgeItem[] = []
  if (wine?.classification) {
    badges.push({ type: 'wine_class', label: wine.classification, icon: 'award' })
  }
  if (wine?.vivinoRating) {
    badges.push({ type: 'vivino', label: `Vivino ${wine.vivinoRating}`, icon: 'grape' })
  }
  if (wine?.criticScores?.WS) {
    badges.push({ type: 'wine_spectator', label: `WS ${wine.criticScores.WS}`, icon: 'trophy' })
  }

  // 사분면 현재 dot
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

  const quadrantVisible = currentDot !== null && recordsWithAxis.length >= 2

  // 연결 식당명 맵 (RecordTimeline용)
  const linkedRestaurantNames = new Map(
    linkedRestaurants.map((r) => [r.restaurantId, r.restaurantName]),
  )

  // 연결 식당 → ConnectedItems용 변환
  const connectedRestaurantItems = linkedRestaurants.map((r) => ({
    id: r.restaurantId,
    name: r.restaurantName,
    imageUrl: r.photoUrl,
    score: r.satisfaction,
    subText: r.genre ?? '',
  }))

  // 콜백
  const handleRecordTap = useCallback(
    (recordId: string) => router.push(`/records/${recordId}`),
    [router],
  )
  const handleBack = useCallback(() => router.back(), [router])
  const handleAdd = useCallback(() => {
    const meta = [wine?.wineType ? WINE_TYPE_LABELS[wine.wineType] : null, wine?.region, wine?.vintage].filter(Boolean).join(' · ')
    router.push(
      `/record?type=wine&targetId=${wineId}&name=${encodeURIComponent(wine?.name ?? '')}&meta=${encodeURIComponent(meta)}&from=detail`,
    )
  }, [router, wineId, wine])
  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: wine?.name, url: window.location.href })
    }
  }, [wine])
  const handleConnectedRestaurantTap = useCallback(
    (id: string) => router.push(`/restaurants/${id}`),
    [router],
  )

  // 히어로 사진: wine.photos/labelImage 우선, 없으면 recordPhotos에서 추출
  const heroPhotos = useMemo(() => {
    if (!wine) return []
    if (wine.photos.length > 0) return wine.photos
    if (wine.labelImageUrl) return [wine.labelImageUrl]
    const urls: string[] = []
    recordPhotos.forEach((photos) => {
      for (const p of photos) urls.push(p.url)
    })
    return urls
  }, [wine, recordPhotos])

  // 로딩
  if (isLoading || !wine) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-wine)] border-t-transparent" />
      </div>
    )
  }

  // 점수 카드 텍스트
  const mySubText = tastingCount > 0 ? `${tastingCount}회 시음` : '미시음'
  const nyamSubText = 'Vivino+WS'
  const bubbleSubText = bubbleCount > 0 ? `평균 · ${bubbleCount}개` : ''

  // 서브 텍스트: 생산자 · 빈티지
  const subParts = [wine.producer, wine.vintage].filter(Boolean)

  // 메타행: 산지 · 품종
  const metaParts = [
    [wine.country, wine.region].filter(Boolean).join(' '),
    wine.variety,
  ].filter(Boolean)

  return (
    <div className="content-detail relative min-h-dvh" style={{ backgroundColor: 'var(--bg)' }}>
      {/* 앱 헤더 */}
      <AppHeader
        variant="inner"
        title={FROM_LABELS[from] ?? '홈'}
        backHref={from === 'profile' ? '/profile' : from === 'bubble' ? '/bubbles' : '/'}
      />

      {/* 스크롤 영역 */}
      <div>
        {/* L1: 히어로 캐러셀 */}
        <HeroCarousel
          photos={heroPhotos}
          fallbackIcon="wine"
          thumbnail={{
            icon: 'wine',
            name: wine.name,
            backgroundUrl: heroPhotos[0] ?? null,
            orientation: 'vertical',
          }}
          isWishlisted={isWishlisted}
          onWishlistToggle={toggleWishlist}
          onShare={handleShare}
        />

        {/* .detail-info (L2 + L3 + 뱃지) */}
        <div>
          {/* L2: 정보 — 이름 + 서브 + 메타행 */}
          <div style={{ padding: '14px 20px 8px' }}>
            {/* 이름 (accent-wine 색상) */}
            <h1 style={{ fontSize: '21px', fontWeight: 800, color: 'var(--accent-wine)' }}>
              {wine.name}
            </h1>

            {/* 서브: 생산자 · 빈티지 */}
            {subParts.length > 0 && (
              <p className="mt-0.5" style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                {subParts.map((part, i, arr) => (
                  <span key={i}>
                    {String(part)}
                    {i < arr.length - 1 && (
                      <span style={{ fontSize: '8px', color: 'var(--border-bold)', margin: '0 5px' }}>·</span>
                    )}
                  </span>
                ))}
              </p>
            )}

            {/* 메타행: WineTypeChip · 산지 · 품종 */}
            <div className="mt-1 flex items-center" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
              <WineTypeChip wineType={wine.wineType} />
              {metaParts.map((part, i) => (
                <span key={i}>
                  <span style={{ fontSize: '8px', color: 'var(--border-bold)', margin: '0 5px' }}>·</span>
                  {part}
                </span>
              ))}
            </div>
          </div>

          {/* L3: 점수 카드 */}
          <ScoreCards
            accentColor="--accent-wine"
            myScore={myAvgScore}
            mySubText={mySubText}
            nyamScore={nyamScoreBreakdown?.finalScore ?? (wine.nyamScore ? Math.round(wine.nyamScore) : null)}
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
            accentColor="--accent-wine"
          />

          {/* 뱃지 행 */}
          <BadgeRow badges={badges} />
        </div>

        {/* L5: 내 와인 지도 (사분면) — 리뷰 2건+ */}
        <QuadrantDisplay
          currentName={wine.name}
          currentDot={currentDot}
          refDots={quadrantRefs}
          accentColor="--accent-wine"
          xAxisLabels={['산미 낮음', '산미 높음']}
          yAxisLabels={['Light Body', 'Full Body']}
          isVisible={quadrantVisible}
          sectionTitle="내 와인 지도"
          sectionMeta=""
        />

        {/* L5b: 음식 페어링 — 디바이더 없이 연속 */}
        {wine.foodPairings.length > 0 && (
          <section style={{ padding: quadrantVisible ? '0 20px 16px' : '16px 20px' }}>
            <h3 className="mb-3.5" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
              음식 페어링
            </h3>
            <FoodPairingTags pairings={wine.foodPairings} />
          </section>
        )}

        <Divider />

        {/* L6: 나의 기록 타임라인 */}
        <RecordTimeline
          records={myRecords}
          recordPhotos={recordPhotos}
          accentColor="--accent-wine"
          sectionTitle="나의 기록"
          sectionMeta={
            tastingCount > 0
              ? `${tastingCount}회 · ${latestTastingDate ?? ''}`
              : ''
          }
          emptyIcon="search"
          emptyTitle="아직 기록이 없어요"
          emptyDescription="우하단 + 버튼으로 첫 기록을 남겨보세요"
          onRecordTap={handleRecordTap}
          targetType="wine"
          linkedRestaurantNames={linkedRestaurantNames}
          onLinkedRestaurantTap={handleConnectedRestaurantTap}
        />

        <Divider />

        {/* L7: 와인 정보 팩트 테이블 */}
        <section style={{ padding: '16px 20px' }}>
          <h3 className="mb-3.5" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            와인 정보
          </h3>
          <WineFactsTable wine={wine} />
        </section>

        <Divider />

        {/* L8: 함께한 레스토랑 — 있을 때만 */}
        {connectedRestaurantItems.length > 0 && (
          <>
            <ConnectedItems
              sectionTitle="함께한 레스토랑"
              sectionMeta=""
              items={connectedRestaurantItems}
              targetType="restaurant"
              onItemTap={handleConnectedRestaurantTap}
            />
            <Divider />
          </>
        )}

        {/* L9: 버블 멤버 기록 */}
        <BubbleRecordSection targetId={wineId} targetType="wine" />

        {/* 하단 spacer */}
        <div style={{ height: '80px' }} />
      </div>

      {/* FAB */}
      <DetailFab onBack={handleBack} onAdd={handleAdd} variant="wine" />
    </div>
  )
}
