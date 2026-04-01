'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FabActions } from '@/presentation/components/layout/fab-actions'
import { RatingInput } from '@/presentation/components/record/rating-input'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useRestaurantDetail } from '@/application/hooks/use-restaurant-detail'
import { useWishlist } from '@/application/hooks/use-wishlist'
import { useShareRecord } from '@/application/hooks/use-share-record'
import { useAxisLevel } from '@/application/hooks/use-axis-level'
import { useBubbleFeed } from '@/application/hooks/use-bubble-feed'
import { useBubbleDetail } from '@/application/hooks/use-bubble-detail'
import { BubbleMiniHeader } from '@/presentation/components/bubble/bubble-mini-header'
import { restaurantRepo, recordRepo, xpRepo } from '@/shared/di/container'
import { GENRE_MAJOR_CATEGORIES } from '@/domain/entities/restaurant'
import { HeroCarousel } from '@/presentation/components/detail/hero-carousel'
import { ScoreCards } from '@/presentation/components/detail/score-cards'
import { BubbleExpandPanel } from '@/presentation/components/detail/bubble-expand-panel'
import { BadgeRow } from '@/presentation/components/detail/badge-row'
import { RecordTimeline } from '@/presentation/components/detail/record-timeline'
import { RestaurantInfo } from '@/presentation/components/detail/restaurant-info'
import { DetailFab } from '@/presentation/components/detail/detail-fab'
import { BubbleRecordSection } from '@/presentation/components/detail/bubble-record-section'
import { AxisLevelBadge } from '@/presentation/components/detail/axis-level-badge'
import { DeleteConfirmModal } from '@/presentation/components/record/delete-confirm-modal'
import { ShareToBubbleSheet } from '@/presentation/components/share/share-to-bubble-sheet'
import { Toast } from '@/presentation/components/ui/toast'
import { AppHeader } from '@/presentation/components/layout/app-header'
import type { BadgeItem } from '@/presentation/components/detail/badge-row'


function getGenreChain(genre: string | null): string | null {
  if (!genre) return null
  for (const [major, subs] of Object.entries(GENRE_MAJOR_CATEGORIES)) {
    if (subs.includes(genre as never)) {
      return major === genre ? genre : `${major} > ${genre}`
    }
  }
  return genre
}

interface RestaurantDetailContainerProps {
  restaurantId: string
  bubbleId: string | null
}


function Divider() {
  return <div style={{ height: '8px', backgroundColor: '#F0EDE8' }} />
}

export function RestaurantDetailContainer({ restaurantId, bubbleId }: RestaurantDetailContainerProps) {
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
    bubbleAvgScore,
    bubbleCount,
    viewMode,
  } = useRestaurantDetail(restaurantId, user?.id ?? null, restaurantRepo)

  const { isWishlisted, toggle: toggleWishlist } = useWishlist(
    user?.id ?? null,
    restaurantId,
    'restaurant',
    recordRepo,
  )

  // 세부 축 레벨 (장르, 지역)
  const axisLevels = useAxisLevel(user?.id ?? null, [
    { axisType: 'genre', axisValue: restaurant?.genre ?? null },
    { axisType: 'area', axisValue: restaurant?.area?.[0] ?? null },
  ])

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

  // ─── 버블 모드 ───
  const isBubbleMode = bubbleId != null
  const { bubble: bubbleInfo } = useBubbleDetail(bubbleId, user?.id ?? null)
  const { shares: bubbleFeedShares } = useBubbleFeed(
    bubbleId,
    isBubbleMode ? 'member' : null,
    'rating_and_comment',
  )
  // 이 식당에 대한 버블 멤버들의 평가만 필터
  const bubbleMemberShares = useMemo(() => {
    if (!isBubbleMode) return []
    return bubbleFeedShares.filter((s) => s.targetId === restaurantId)
  }, [isBubbleMode, bubbleFeedShares, restaurantId])

  // 버블 멤버 사분면 dots: 내 dot만 컬러, 나머지 그레이스케일
  const bubbleRefPoints = useMemo(() => {
    return bubbleMemberShares
      .filter((s) => s.axisX != null && s.axisY != null && s.satisfaction != null)
      .map((s) => {
        const isMe = s.sharedBy === user?.id
        return {
          x: s.axisX!,
          y: s.axisY!,
          satisfaction: isMe ? s.satisfaction! : 0,  // 0 → gaugeColor가 회색 계열
          name: s.authorName ?? '',
          score: s.satisfaction!,
        }
      })
  }, [bubbleMemberShares, user?.id])

  // 버블 평균 점수
  const bubbleMemberAvg = useMemo(() => {
    const rated = bubbleMemberShares.filter((s) => s.satisfaction != null)
    if (rated.length === 0) return null
    return Math.round(rated.reduce((sum, s) => sum + (s.satisfaction ?? 0), 0) / rated.length)
  }, [bubbleMemberShares])

  // 사분면 현재 dot (이 식당 내 모든 방문의 평균)
  const allRecordsWithAxis = myRecords.filter((r) => r.axisX !== null && r.axisY !== null && r.satisfaction !== null)
  const currentDot = allRecordsWithAxis.length > 0
    ? {
        axisX: Math.round(allRecordsWithAxis.reduce((s, r) => s + r.axisX!, 0) / allRecordsWithAxis.length),
        axisY: Math.round(allRecordsWithAxis.reduce((s, r) => s + r.axisY!, 0) / allRecordsWithAxis.length),
        satisfaction: Math.round(allRecordsWithAxis.reduce((s, r) => s + r.satisfaction!, 0) / allRecordsWithAxis.length),
      }
    : null



  // 연결 와인 이름 맵 (타임라인용)
  const linkedWineNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const w of linkedWines) map.set(w.wineId, w.wineName)
    return map
  }, [linkedWines])

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
      // XP 이력을 레코드 삭제 전에 조회 (CASCADE 삭제 대비)
      const histories = await xpRepo.getHistoriesByRecord(latestRecordId)

      await recordRepo.delete(latestRecordId)

      // XP 차감 (best-effort: 레코드는 이미 삭제됨)
      try {
        if (histories.length > 0) {
          let totalXpToDeduct = 0
          for (const h of histories) totalXpToDeduct += h.xpAmount
          await xpRepo.updateUserTotalXp(user.id, -totalXpToDeduct)
          await xpRepo.deleteByRecordId(latestRecordId)
        }
      } catch {
        // CASCADE로 이미 삭제된 경우 무시
      }

      setShowDeleteConfirm(false)
      setToastMsg('기록이 삭제되었습니다')
      setTimeout(() => router.replace('/'), 800)
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

  const genreChain = getGenreChain(restaurant.genre)
  const mySubText = myRecords.length > 0 ? `${myRecords.length}회 방문` : '미방문'
  const bubbleSubText = bubbleCount > 0 ? `리뷰 ${bubbleCount}개` : ''
  return (
    <div className="content-detail relative min-h-dvh" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader />

      {isBubbleMode && bubbleInfo && (
        <div style={{ position: 'sticky', top: '46px', zIndex: 80 }}>
          <BubbleMiniHeader
            bubbleId={bubbleId!}
            name={bubbleInfo.name}
            description={bubbleInfo.description}
            icon={bubbleInfo.icon}
            iconBgColor={bubbleInfo.iconBgColor}
            memberCount={bubbleInfo.memberCount}
            showBack
          />
        </div>
      )}

      <div>
        <HeroCarousel
          photos={heroPhotos}
          fallbackIcon="restaurant"
          isWishlisted={isWishlisted}
          onWishlistToggle={toggleWishlist}
          onShare={handlePageShare}
        />

        {/* ─── 1. 이름 + 분류 + 가격대 ─── */}
        <div>
          <div style={{ padding: '14px 20px 8px' }}>
            <h1 style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text)' }}>
              {restaurant.name}
            </h1>

            <div className="mt-1 flex items-center gap-1.5">
              {genreChain && (
                <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                  {genreChain}
                </span>
              )}
              {restaurant.priceRange && (
                <>
                  {genreChain && <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>·</span>}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-food)' }}>
                    {restaurant.priceRange === 1 ? '저가' : restaurant.priceRange === 2 ? '중간' : '고가'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ─── 2. 스코어카드 + 버블 확장 + 뱃지 ─── */}
          <ScoreCards
            accentColor="--accent-food"
            myScore={isBubbleMode ? bubbleMemberAvg : myAvgScore}
            mySubText={isBubbleMode ? `버블 평균 · ${bubbleMemberShares.filter((s) => s.satisfaction != null).length}명` : mySubText}
            bubbleScore={isBubbleMode ? myAvgScore : bubbleAvgScore}
            bubbleSubText={isBubbleMode ? (myRecords.length > 0 ? `나 · ${myRecords.length}회` : '미방문') : bubbleSubText}
            onBubbleCardTap={() => setBubbleExpanded(!bubbleExpanded)}
            isBubbleExpanded={bubbleExpanded}
          />

          {!isBubbleMode && (
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
          )}

          <BadgeRow badges={badges} />
        </div>

        {/* ─── 3. 평가 사분면 ─── */}
        {isBubbleMode && bubbleRefPoints.length > 0 ? (
          <>
            <Divider />
            <section style={{ padding: '16px 20px' }}>
              <h3 className="mb-4" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                버블 멤버 평가
                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-hint)', marginLeft: '8px' }}>
                  {bubbleRefPoints.length}명
                </span>
              </h3>
              <RatingInput
                type="restaurant"
                value={currentDot
                  ? { x: currentDot.axisX, y: currentDot.axisY, satisfaction: currentDot.satisfaction }
                  : { x: 50, y: 50 }
                }
                onChange={() => {}}
                readOnly
                hideDot={!currentDot}
                referencePoints={bubbleRefPoints}
              />
            </section>
          </>
        ) : viewMode === 'my_records' && currentDot ? (
          <>
            <Divider />
            <section style={{ padding: '16px 20px' }}>
              <h3 className="mb-4" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                나의 평가
                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-hint)', marginLeft: '8px' }}>
                  {myRecords.length}회 방문 평균
                </span>
              </h3>
              <RatingInput
                type="restaurant"
                value={{ x: currentDot.axisX, y: currentDot.axisY, satisfaction: currentDot.satisfaction }}
                onChange={() => {}}
                readOnly
                referencePoints={quadrantRefs.map((d) => ({
                  x: d.avgAxisX,
                  y: d.avgAxisY,
                  satisfaction: d.avgSatisfaction,
                  name: d.targetName,
                  score: d.avgSatisfaction,
                }))}
              />
            </section>
          </>
        ) : null}

        <Divider />

        {/* ─── 4. 나의 기록 타임라인 ─── */}
        {axisLevels.length > 0 && myRecords.length > 0 && (
          <div className="flex items-center gap-1.5 px-5 pt-4">
            {axisLevels.map((al) => (
              <AxisLevelBadge key={al.axisValue} axisLabel={al.axisValue} level={al.level} />
            ))}
          </div>
        )}
        <RecordTimeline
          records={myRecords}
          recordPhotos={recordPhotos}
          accentColor="--accent-food"
          sectionTitle="나의 기록"
          sectionMeta={
            myRecords.length > 0
              ? `방문 ${myRecords.length}회 · ${latestVisitDate ?? ''}`
              : ''
          }
          emptyIcon="search"
          emptyTitle="아직 방문 기록이 없어요"
          emptyDescription="우하단 + 버튼으로 첫 기록을 남겨보세요"
          linkedWineNames={linkedWineNames}
          onLinkedWineTap={(id) => router.push(`/wines/${id}`)}
        />

        <Divider />

        {/* ─── 5. 버블 기록 ─── */}
        <BubbleRecordSection targetId={restaurantId} targetType="restaurant" />

        <Divider />

        {/* ─── 6. 식당 정보 ─── */}
        <RestaurantInfo
          address={restaurant.address}
          hours={restaurant.hours}
          phone={restaurant.phone}
          lat={restaurant.lat}
          lng={restaurant.lng}
          name={restaurant.name}
          menus={restaurant.menus ?? []}
          showMenuSection={viewMode === 'my_records'}
          externalIds={restaurant.externalIds}
        />

        {/* 하단 spacer (FAB + 액션바 클리어런스) */}
        <div style={{ height: myRecords.length > 0 ? '140px' : '80px' }} />
      </div>

      {/* FAB + 액션 버튼 — 같은 높이 */}
      <DetailFab onBack={handleBack} onAdd={handleAdd} />

      {myRecords.length > 0 && (
        <FabActions
          variant="food"
          onEdit={handleEdit}
          onDelete={() => setShowDeleteConfirm(true)}
        />
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
