'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Share2, Trash2 } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useRestaurantDetail } from '@/application/hooks/use-restaurant-detail'
import { useWishlist } from '@/application/hooks/use-wishlist'
import { useShareRecord } from '@/application/hooks/use-share-record'
import { restaurantRepo, wishlistRepo, recordRepo, xpRepo } from '@/shared/di/container'
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
import { DeleteConfirmModal } from '@/presentation/components/record/delete-confirm-modal'
import { ShareToBubbleSheet } from '@/presentation/components/share/share-to-bubble-sheet'
import { Toast } from '@/presentation/components/ui/toast'
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

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

  // 최신 기록 ID (하단 액션 대상)
  const latestRecordId = myRecords[0]?.id ?? null

  // 버블 공유 hook (최신 기록 대상)
  const { availableBubbles, shareToBubbles, canShare, blockReason } = useShareRecord(user?.id ?? null, latestRecordId)

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

  // 사분면 현재 dot (이 식당 내 모든 방문의 평균)
  const allVisitsWithAxis = myRecords.flatMap((r) =>
    r.visits.filter((v) => v.axisX !== null && v.axisY !== null && v.satisfaction !== null),
  )
  const currentDot = allVisitsWithAxis.length > 0
    ? {
        axisX: Math.round(allVisitsWithAxis.reduce((s, v) => s + v.axisX!, 0) / allVisitsWithAxis.length),
        axisY: Math.round(allVisitsWithAxis.reduce((s, v) => s + v.axisY!, 0) / allVisitsWithAxis.length),
        satisfaction: Math.round(allVisitsWithAxis.reduce((s, v) => s + v.satisfaction!, 0) / allVisitsWithAxis.length),
      }
    : null

  const quadrantVisible = viewMode === 'my_records' && currentDot !== null && quadrantRefs.length >= 1

  const connectedWineItems = linkedWines.map((w) => ({
    id: w.wineId,
    name: w.wineName,
    imageUrl: w.labelImageUrl,
    score: w.satisfaction,
    subText: w.wineType ?? '',
  }))

  // ─── 콜백 ───
  const handleBack = useCallback(() => router.back(), [router])
  const handleAdd = useCallback(() => {
    const meta = [restaurant?.genre, restaurant?.area].filter(Boolean).join(' · ')
    router.push(
      `/record?type=restaurant&targetId=${restaurantId}&name=${encodeURIComponent(restaurant?.name ?? '')}&meta=${encodeURIComponent(meta)}&from=detail`,
    )
  }, [router, restaurantId, restaurant])

  const handleEdit = useCallback(() => {
    if (!latestRecordId) return
    const meta = [restaurant?.genre, restaurant?.area].filter(Boolean).join(' · ')
    router.push(
      `/record?type=restaurant&targetId=${restaurantId}&name=${encodeURIComponent(restaurant?.name ?? '')}&meta=${encodeURIComponent(meta)}&edit=${latestRecordId}&from=detail`,
    )
  }, [latestRecordId, restaurant, restaurantId, router])

  const handleShare = useCallback(() => {
    if (!canShare) {
      setToastMsg(blockReason ?? '비공개 프로필은 공유할 수 없습니다')
    } else {
      setShowShareSheet(true)
    }
  }, [canShare, blockReason])

  const handleDelete = useCallback(async () => {
    if (!latestRecordId || !user) return
    setIsDeleting(true)
    try {
      await recordRepo.delete(latestRecordId)
      const histories = await xpRepo.getHistoriesByRecord(latestRecordId)
      if (histories.length > 0) {
        let totalXpToDeduct = 0
        for (const h of histories) totalXpToDeduct += h.xpAmount
        await xpRepo.updateUserTotalXp(user.id, -totalXpToDeduct)
        await xpRepo.deleteByRecordId(latestRecordId)
      }
      setShowDeleteConfirm(false)
      router.refresh()
    } catch {
      setToastMsg('삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
    }
  }, [latestRecordId, user, router])

  const handlePageShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: restaurant?.name, url: window.location.href })
    }
  }, [restaurant])
  const handleConnectedWineTap = useCallback(
    (id: string) => router.push(`/wines/${id}`),
    [router],
  )

  // 히어로 사진
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

  if (isLoading || !restaurant) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  const metaParts = [restaurant.genre, restaurant.area]
  if (restaurant.priceRange) metaParts.push('₩'.repeat(restaurant.priceRange))
  const metaText = metaParts.filter(Boolean).join(' · ')
  const mySubText = visitCount > 0 ? `${visitCount}회 방문` : '미방문'
  const nyamSubText = '웹+명성'
  const bubbleSubText = bubbleCount > 0 ? `평균 · ${bubbleCount}개` : ''
  const heroThumbnail = {
    icon: 'utensils',
    name: restaurant.name,
    backgroundUrl: heroPhotos[0] ?? null,
    orientation: 'horizontal' as const,
  }

  return (
    <div className="content-detail relative min-h-dvh" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader />

      <div>
        <HeroCarousel
          photos={heroPhotos}
          fallbackIcon="restaurant"
          thumbnail={heroThumbnail}
          isWishlisted={isWishlisted}
          onWishlistToggle={toggleWishlist}
          onShare={handlePageShare}
        />

        <div>
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
        />

        <Divider />

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

        <BubbleRecordSection targetId={restaurantId} targetType="restaurant" />

        {/* 하단 spacer (FAB + 액션바 클리어런스) */}
        <div style={{ height: myRecords.length > 0 ? '140px' : '80px' }} />
      </div>

      {/* FAB */}
      <DetailFab onBack={handleBack} onAdd={handleAdd} />

      {/* ─── 하단 고정 액션 바 (기록 있을 때만) ─── */}
      {myRecords.length > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-center gap-3 px-5 pb-6 pt-3"
          style={{
            background: 'linear-gradient(to top, var(--bg) 70%, transparent)',
          }}
        >
          <button
            type="button"
            onClick={handleEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: 'var(--accent-food)',
            }}
          >
            <Pencil size={14} />
            수정
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 rounded-xl px-5 py-3"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-sub)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <Share2 size={14} />
            공유
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl px-5 py-3"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--negative)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <Trash2 size={14} />
            삭제
          </button>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ShareToBubbleSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        bubbles={availableBubbles}
        onShareMultiple={shareToBubbles}
      />

      <Toast
        message={toastMsg ?? ''}
        visible={!!toastMsg}
        onHide={() => setToastMsg(null)}
      />
    </div>
  )
}
