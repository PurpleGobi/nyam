'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, UtensilsCrossed } from 'lucide-react'
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
import { useTargetScores } from '@/application/hooks/use-target-scores'
import { useDeleteRecord } from '@/application/hooks/use-delete-record'
import { GENRE_MAJOR_CATEGORIES } from '@/domain/entities/restaurant'
import { HeroCarousel } from '@/presentation/components/detail/hero-carousel'
import { ScoreCards } from '@/presentation/components/detail/score-cards'
import { BadgeRow } from '@/presentation/components/detail/badge-row'
import { RecordTimeline } from '@/presentation/components/detail/record-timeline'
import { RestaurantInfo } from '@/presentation/components/detail/restaurant-info'
import { DetailFab } from '@/presentation/components/detail/detail-fab'
import { BubbleRecordSection } from '@/presentation/components/detail/bubble-record-section'
import { AxisLevelBadge } from '@/presentation/components/detail/axis-level-badge'
import { DeleteConfirmModal } from '@/presentation/components/record/delete-confirm-modal'
import { ShareToBubbleSheet } from '@/presentation/components/share/share-to-bubble-sheet'
import { useToast } from '@/presentation/components/ui/toast'
import { AppHeader } from '@/presentation/components/layout/app-header'
import type { BadgeItem } from '@/presentation/components/detail/badge-row'



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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [focusedRecordIdx, setFocusedRecordIdx] = useState(0) // 최근 뷰에서 포커스된 기록 (0 = 최신)
  const { showToast } = useToast()
  const { deleteRecord, isDeleting } = useDeleteRecord()

  const {
    restaurant,
    myRecords,
    recordPhotos,
    quadrantRefs,
    linkedWines,
    bubbleScores,
    followingRecords,
    publicRecords,
    isLoading,
    myAvgScore,
    visitCount,
    latestVisitDate,
    bubbleAvgScore,
    bubbleCount,
    followingAvgScore,
    followingCount,
    nyamAvgScore,
    nyamCount,
    viewMode,
  } = useRestaurantDetail(restaurantId, user?.id ?? null)

  const {
    cards: scoreCards,
    selectedSources,
    quadrantMode,
    toggleSource,
    setQuadrantMode,
    isCardToggleActive,
  } = useTargetScores({
    myAvgScore,
    myCount: visitCount,
    followingAvgScore,
    followingCount,
    bubbleAvgScore,
    bubbleCount,
    nyamAvgScore,
    nyamCount,
  })

  const { isWishlisted, toggle: toggleWishlist } = useWishlist(
    user?.id ?? null,
    restaurantId,
    'restaurant',
  )

  // 세부 축 레벨 (장르, 지역)
  const areaAxisValue = restaurant?.area?.[0] ?? restaurant?.district ?? null
  const axisLevels = useAxisLevel(user?.id ?? null, [
    { axisType: 'genre', axisValue: restaurant?.genre ?? null },
    { axisType: 'area', axisValue: areaAxisValue },
  ])

  // 버블 공유 hook — activeRecordId는 focusedRecord 이후에 계산
  const latestRecordIdFallback = myRecords[0]?.id ?? null

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
  // 사분면 현재 dot (이 식당 내 모든 방문의 평균)
  const allRecordsWithAxis = myRecords.filter((r) => r.axisX !== null && r.axisY !== null && r.satisfaction !== null)
  const avgDot = allRecordsWithAxis.length > 0
    ? {
        axisX: Math.round(allRecordsWithAxis.reduce((s, r) => s + r.axisX!, 0) / allRecordsWithAxis.length),
        axisY: Math.round(allRecordsWithAxis.reduce((s, r) => s + r.axisY!, 0) / allRecordsWithAxis.length),
        satisfaction: Math.round(allRecordsWithAxis.reduce((s, r) => s + r.satisfaction!, 0) / allRecordsWithAxis.length),
      }
    : null

  // 최근 기록 dot
  const sortedRecords = useMemo(() =>
    [...allRecordsWithAxis].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [allRecordsWithAxis],
  )
  const focusedRecord = sortedRecords[focusedRecordIdx] ?? sortedRecords[0] ?? null
  const focusedDot = focusedRecord
    ? { axisX: focusedRecord.axisX!, axisY: focusedRecord.axisY!, satisfaction: focusedRecord.satisfaction! }
    : null
  const otherRecordRefs = useMemo(() =>
    sortedRecords
      .map((r, i) => ({ r, i }))
      .filter(({ i }) => i !== focusedRecordIdx)
      .map(({ r, i }) => ({
        x: r.axisX!,
        y: r.axisY!,
        satisfaction: r.satisfaction!,
        name: r.visitDate ?? r.createdAt.split('T')[0],
        score: r.satisfaction!,
        _refIdx: i, // 롱프레스 시 focus 전환용
      })),
    [sortedRecords, focusedRecordIdx],
  )

  // visits 모드에서 selectedSource에 따른 타인 micro dot
  const visitsRefPoints = useMemo(() => {
    // 내 기록 ref dots (selectedSources에 'my'가 있을 때)
    const myRefs = selectedSources.includes('my') ? otherRecordRefs : []

    // 타인 micro dots
    type MicroSource = { axisX: number | null; axisY: number | null; satisfaction: number | null }
    const microRecords: MicroSource[] = []

    if (selectedSources.includes('following')) {
      microRecords.push(...followingRecords.filter((r) => r.axisX != null && r.axisY != null))
    }
    // bubble: bubbleScores에 axisX/axisY 없으므로 현재 미지원
    if (selectedSources.includes('nyam')) {
      microRecords.push(...publicRecords.filter((r) => r.axisX != null && r.axisY != null))
    }

    const microDots = microRecords.slice(0, 20).map((r) => ({
      x: r.axisX ?? 50,
      y: r.axisY ?? 50,
      satisfaction: r.satisfaction ?? 50,
      name: '',
      score: r.satisfaction ?? 50,
      isMicroDot: true,
    }))

    return [...myRefs, ...microDots]
  }, [selectedSources, otherRecordRefs, followingRecords, publicRecords])

  const currentDot = quadrantMode === 'visits' && focusedDot ? focusedDot : avgDot

  // 액션 대상 기록 ID (최근 뷰에서는 포커스된 기록, 평균 뷰에서는 최신 기록)
  const activeRecordId = quadrantMode === 'visits' && focusedRecord
    ? focusedRecord.id
    : latestRecordIdFallback
  const { availableBubbles, shareToBubbles, canShare, blockReason } = useShareRecord(user?.id ?? null, activeRecordId)

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
    if (!activeRecordId) return
    const meta = [restaurant?.genre, restaurant?.area].filter(Boolean).join(' · ')
    router.push(
      `/record?type=restaurant&targetId=${restaurantId}&name=${encodeURIComponent(restaurant?.name ?? '')}&meta=${encodeURIComponent(meta)}&edit=${activeRecordId}&from=detail`,
    )
  }, [activeRecordId, restaurant, restaurantId, router])

  const handleShare = useCallback(() => {
    if (!canShare) {
      showToast(blockReason ?? '비공개 프로필은 공유할 수 없습니다')
    } else {
      setShowShareSheet(true)
    }
  }, [canShare, blockReason])

  const handleDelete = useCallback(async () => {
    if (!activeRecordId || !user) return
    try {
      const result = await deleteRecord(activeRecordId, user.id, restaurantId, 'restaurant')

      setShowDeleteConfirm(false)
      showToast('기록이 삭제���었습니다')
      if (result.sharesCount > 0) {
        showToast(`${result.sharesCount}개 버블 공유도 함께 삭제되었습니다`)
      }
      if (result.remainingCount > 0) {
        showToast(`이 식당의 기록이 ${result.remainingCount}건 ���아있습니다`)
      }

      router.replace('/')
    } catch {
      showToast('삭제에 실패했습니���')
    }
  }, [activeRecordId, user, router, restaurantId, showToast, deleteRecord])

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

        {/* ─── 1. 이름 + 지역 + 장르 + 가격대 ─── */}
        <div>
          <section style={{ padding: '14px 20px 0' }}>
            <h1 style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text)' }}>
              {restaurant.name}
            </h1>

            {restaurant.priceRange && (
              <div className="mt-0.5">
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-food)' }}>
                  {restaurant.priceRange === 1 ? '저가' : restaurant.priceRange === 2 ? '중간' : '고가'}
                </span>
              </div>
            )}

            <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '10px 0' }} />

            {/* 지역 cascade: country › city › area › district */}
            {(restaurant.country || restaurant.city) && (
              <div className="flex flex-wrap items-center gap-1 py-1" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: '12px', fontWeight: 700, backgroundColor: 'color-mix(in srgb, var(--accent-food) 12%, transparent)', color: 'var(--accent-food)' }}>
                  <MapPin size={11} />
                  {restaurant.country}
                </span>
                {restaurant.city && (
                  <>
                    <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>›</span>
                    <span>{restaurant.city}</span>
                  </>
                )}
                {restaurant.area && restaurant.area.length > 0 && (
                  <>
                    <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>›</span>
                    <span>{restaurant.area[0]}</span>
                  </>
                )}
                {restaurant.district && (
                  <>
                    <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>›</span>
                    <span>{restaurant.district}</span>
                  </>
                )}
                {axisLevels.find((al) => al.axisValue === areaAxisValue) && (
                  <AxisLevelBadge level={axisLevels.find((al) => al.axisValue === areaAxisValue)!.level} />
                )}
              </div>
            )}

            {/* 장르 cascade: 대분류 › 소분류 */}
            {restaurant.genre && (
              <div className="flex flex-wrap items-center gap-1 py-1">
                {(() => {
                  const major = Object.entries(GENRE_MAJOR_CATEGORIES).find(([, subs]) => subs.includes(restaurant.genre as never))?.[0]
                  const showMajor = major && major !== restaurant.genre
                  return (
                    <>
                      {showMajor && (
                        <>
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--accent-food) 10%, transparent)', color: 'var(--accent-food)' }}
                          >
                            <UtensilsCrossed size={11} />
                            {major}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>›</span>
                        </>
                      )}
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--accent-food) 10%, transparent)', color: 'var(--accent-food)' }}
                      >
                        {!showMajor && <UtensilsCrossed size={11} />}
                        {restaurant.genre}
                      </span>
                    </>
                  )
                })()}
                {axisLevels.find((al) => al.axisValue === restaurant.genre) && (
                  <AxisLevelBadge level={axisLevels.find((al) => al.axisValue === restaurant.genre)!.level} />
                )}
              </div>
            )}

            <div style={{ height: '8px' }} />
          </section>

          {/* ─── 2. 스코어카드 + 버블 확장 + 뱃지 ─── */}
          <ScoreCards
            accentColor="--accent-food"
            cards={scoreCards}
            selectedSources={selectedSources}
            onToggle={toggleSource}
            toggleActive={isCardToggleActive}
          />

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
                  {quadrantMode === 'compare'
                    ? `${myRecords.length}회 방문`
                    : `최근 방문${focusedRecord?.visitDate ? ` · ${focusedRecord.visitDate}` : ''}`
                  }
                </span>
              </h3>
              <RatingInput
                type="restaurant"
                value={{ x: currentDot.axisX, y: currentDot.axisY, satisfaction: currentDot.satisfaction }}
                onChange={() => {}}
                readOnly
                referencePoints={quadrantMode === 'compare'
                  ? quadrantRefs.map((d) => ({
                      x: d.avgAxisX,
                      y: d.avgAxisY,
                      satisfaction: d.avgSatisfaction,
                      name: d.targetName,
                      score: d.avgSatisfaction,
                      targetId: d.targetId,
                      targetType: 'restaurant' as const,
                    }))
                  : visitsRefPoints
                }
                onRefNavigate={quadrantMode === 'compare'
                  ? (id, type) => router.push(`/${type === 'wine' ? 'wines' : 'restaurants'}/${id}`)
                  : undefined
                }
                onRefLongPress={quadrantMode === 'visits' && selectedSources.includes('my')
                  ? (refIdx) => setFocusedRecordIdx(otherRecordRefs[refIdx]?._refIdx ?? 0)
                  : undefined
                }
                quadrantMode={allRecordsWithAxis.length >= 2 ? quadrantMode : undefined}
                onQuadrantModeChange={allRecordsWithAxis.length >= 2 ? (mode) => {
                  setQuadrantMode(mode)
                  setFocusedRecordIdx(0)
                } : undefined}
              />
            </section>
          </>
        ) : null}

        <Divider />

        {/* ─── 4. 나의 기록 타임라인 ─── */}
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

    </div>
  )
}
