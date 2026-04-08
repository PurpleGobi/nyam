'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, UtensilsCrossed } from 'lucide-react'
import { FabActions } from '@/presentation/components/layout/fab-actions'
import { RatingInput } from '@/presentation/components/record/rating-input'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useRestaurantDetail } from '@/application/hooks/use-restaurant-detail'
import { useBookmark } from '@/application/hooks/use-bookmark'
import { useShareRecord } from '@/application/hooks/use-share-record'
import { useAxisLevel } from '@/application/hooks/use-axis-level'
import { useBubbleFeed } from '@/application/hooks/use-bubble-feed'
import { useBubbleDetail } from '@/application/hooks/use-bubble-detail'
import { BubbleMiniHeader } from '@/presentation/components/bubble/bubble-mini-header'
import { useTargetScores } from '@/application/hooks/use-target-scores'
import type { ScoreSource } from '@/domain/entities/score'
import { useDeleteRecord } from '@/application/hooks/use-delete-record'
import { GENRE_MAJOR_CATEGORIES } from '@/domain/entities/restaurant'
import { HeroCarousel } from '@/presentation/components/detail/hero-carousel'
import { ScoreCards } from '@/presentation/components/detail/score-cards'
import { ScoreBreakdownPanel } from '@/presentation/components/detail/score-breakdown-panel'
import { BubbleExpandPanel } from '@/presentation/components/detail/bubble-expand-panel'
import { BadgeRow } from '@/presentation/components/detail/badge-row'
import { RecordTimeline } from '@/presentation/components/detail/record-timeline'
import { RestaurantInfo } from '@/presentation/components/detail/restaurant-info'
import { DetailFab } from '@/presentation/components/detail/detail-fab'
import { AllRecordsSection } from '@/presentation/components/detail/all-records-section'
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
  return <div style={{ height: '8px', backgroundColor: 'var(--bg-elevated)' }} />
}

export function RestaurantDetailContainer({ restaurantId, bubbleId }: RestaurantDetailContainerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [focusedRecordIdx, setFocusedRecordIdx] = useState(0) // 최근 뷰에서 포커스된 기록 (0 = 최신)
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const [bubbleExpandOpen, setBubbleExpandOpen] = useState(false)
  const { showToast } = useToast()
  const { deleteRecord, isDeleting } = useDeleteRecord()

  const {
    restaurant,
    myRecords,
    recordPhotos,
    quadrantRefs,
    linkedWines,
    bubbleScores,
    publicRecords,
    isLoading,
    myAvgScore,
    visitCount,
    latestVisitDate,
    bubbleAvgScore,
    bubbleCount,
    nyamAvgScore,
    nyamCount,
    nyamConfidence,
    nyamBreakdown,
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
    bubbleAvgScore,
    bubbleCount,
    nyamAvgScore,
    nyamCount,
    nyamConfidence,
  })

  const handleScoreToggle = useCallback((source: ScoreSource) => {
    toggleSource(source)
    if (source === 'nyam') {
      setBreakdownOpen((prev) => !prev)
      setBubbleExpandOpen(false)
    } else if (source === 'bubble') {
      setBubbleExpandOpen((prev) => !prev)
      setBreakdownOpen(false)
    } else {
      setBreakdownOpen(false)
      setBubbleExpandOpen(false)
    }
  }, [toggleSource])

  const { isBookmarked, toggle: toggleBookmark } = useBookmark(
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
  const allRecordsWithAxis = useMemo(
    () => myRecords.filter((r) => r.axisX !== null && r.axisY !== null && r.satisfaction !== null),
    [myRecords],
  )
  const avgDot = useMemo(
    () => allRecordsWithAxis.length > 0
      ? {
          axisX: Math.round(allRecordsWithAxis.reduce((s, r) => s + r.axisX!, 0) / allRecordsWithAxis.length),
          axisY: Math.round(allRecordsWithAxis.reduce((s, r) => s + r.axisY!, 0) / allRecordsWithAxis.length),
          satisfaction: Math.round(allRecordsWithAxis.reduce((s, r) => s + r.satisfaction!, 0) / allRecordsWithAxis.length),
        }
      : null,
    [allRecordsWithAxis],
  )

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
  // 소스 우선순위 dedup: mine > bubble (nyam은 CF 예측이므로 개별 dot 없음)
  const visitsRefPoints = useMemo(() => {
    const seenRecordIds = new Set<string>()

    // 1. 내 기록 micro dots (최우선)
    const myMicroDots = selectedSources.includes('mine')
      ? otherRecordRefs.map((r) => {
          const rid = r._refIdx !== undefined ? sortedRecords[r._refIdx]?.id : undefined
          if (rid) seenRecordIds.add(rid)
          return { ...r, isMicroDot: true as const }
        })
      : []

    // 타인 micro dots (30개 제한)
    type MicroDot = { x: number; y: number; satisfaction: number; name: string; score: number; isMicroDot: true }
    const otherMicroDots: MicroDot[] = []
    const MAX_OTHER = 30

    // 2. 버블 (dots에 id 없으므로 ID 기반 dedup 불가 — 그대로 추가)
    if (selectedSources.includes('bubble')) {
      for (const b of bubbleScores) {
        for (const d of b.dots) {
          if (otherMicroDots.length >= MAX_OTHER) break
          otherMicroDots.push({ x: d.axisX, y: d.axisY, satisfaction: d.satisfaction, name: '', score: d.satisfaction, isMicroDot: true })
        }
      }
    }

    return [...myMicroDots, ...otherMicroDots]
  }, [selectedSources, otherRecordRefs, sortedRecords, bubbleScores])

  // 타인 기록에서 폴백 dot 계산 (내 기록이 없을 때)
  const bubbleAxisRecords = useMemo(
    () => bubbleScores.flatMap((b) => b.dots),
    [bubbleScores],
  )
  const fallbackDot = useMemo(() => {
    if (avgDot) return null
    const candidates: Array<[ScoreSource, Array<{ axisX: number; axisY: number; satisfaction: number }>]> = [
      ['bubble', bubbleAxisRecords],
    ]
    const match = candidates.find(([source, dots]) => selectedSources.includes(source) && dots.length > 0)
    if (!match) return null
    const [, dots] = match
    return {
      axisX: Math.round(dots.reduce((s, d) => s + d.axisX, 0) / dots.length),
      axisY: Math.round(dots.reduce((s, d) => s + d.axisY, 0) / dots.length),
      satisfaction: Math.round(dots.reduce((s, d) => s + d.satisfaction, 0) / dots.length),
    }
  }, [avgDot, selectedSources, bubbleAxisRecords])

  const mySelected = selectedSources.includes('mine')
  const currentDot = mySelected
    ? (quadrantMode === 'visits' && focusedDot ? focusedDot : avgDot)
    : null

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
  }, [canShare, blockReason, showToast])

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
  // 히어로 사진: 소스 우선순위(나→팔로잉→공개) 기준 최신 사진
  const heroPhotos = useMemo(() => {
    if (!restaurant) return []
    const getPhotosFromRecords = (records: typeof myRecords) => {
      const urls: string[] = []
      const sorted = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      for (const record of sorted) {
        const photos = recordPhotos.get(record.id)
        if (photos) {
          for (const p of photos) urls.push(p.url)
        }
      }
      return urls
    }
    // 소스 우선순위: 나 → 공개 기록 → 식당 기본 사진
    for (const records of [myRecords, publicRecords]) {
      const urls = getPhotosFromRecords(records)
      if (urls.length > 0) return urls
    }
    const base = restaurant.photos ?? []
    if (base.length > 0) return base
    return []
  }, [restaurant, myRecords, publicRecords, recordPhotos])

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
          isBookmarked={isBookmarked}
          onBookmarkToggle={toggleBookmark}
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
                {viewMode === 'my_records' && axisLevels.find((al) => al.axisValue === areaAxisValue) && (
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
                {viewMode === 'my_records' && axisLevels.find((al) => al.axisValue === restaurant.genre) && (
                  <AxisLevelBadge level={axisLevels.find((al) => al.axisValue === restaurant.genre)!.level} />
                )}
              </div>
            )}

            <div style={{ height: '8px' }} />
          </section>

          {/* ─── 2. 뱃지 + 스코어카드 ─── */}
          <BadgeRow badges={badges} />

          <ScoreCards
            accentColor="--accent-food"
            cards={scoreCards}
            selectedSources={selectedSources}
            onToggle={handleScoreToggle}
            toggleActive={isCardToggleActive}
          />

          <ScoreBreakdownPanel
            isOpen={breakdownOpen}
            breakdown={nyamBreakdown}
            accentColor="--accent-food"
          />

          <BubbleExpandPanel
            isOpen={bubbleExpandOpen}
            bubbleScores={bubbleScores.map((b) => ({
              bubbleId: b.bubbleId,
              bubbleName: b.bubbleName,
              icon: b.bubbleIcon ?? null,
              iconBgColor: b.bubbleColor ?? null,
              ratingCount: b.dots.length,
              avgScore: b.avgScore,
              cfScore: null,
              memberCount: b.memberCount,
            }))}
            accentColor="--accent-food"
          />
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
        ) : (currentDot || visitsRefPoints.length > 0) ? (
          <>
            <Divider />
            <section style={{ padding: '16px 20px' }}>
              <h3 className="mb-4" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                {(() => {
                  const SCORE_SOURCES: ScoreSource[] = ['mine', 'nyam', 'bubble']
                  const LABELS: Record<ScoreSource, string> = { mine: '나의 평가', nyam: 'Nyam 평가', bubble: '버블 평가' }
                  const top = SCORE_SOURCES.find((s) => selectedSources.includes(s)) ?? 'mine'
                  return LABELS[top]
                })()}
                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-hint)', marginLeft: '8px' }}>
                  {viewMode === 'my_records' && quadrantMode === 'compare'
                    ? `${myRecords.length}회 방문`
                    : viewMode === 'my_records'
                      ? `최근 방문${focusedRecord?.visitDate ? ` · ${focusedRecord.visitDate}` : ''}`
                      : `${visitsRefPoints.length}개 기록`
                  }
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
                onRefLongPress={quadrantMode === 'visits' && selectedSources.includes('mine')
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

        {/* ─── 5. 모든 기록 ─── */}
        <AllRecordsSection targetId={restaurantId} targetType="restaurant" />

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
