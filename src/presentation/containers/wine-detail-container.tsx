'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Grape } from 'lucide-react'
import { FabActions } from '@/presentation/components/layout/fab-actions'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useWineDetail } from '@/application/hooks/use-wine-detail'
import { useWishlist } from '@/application/hooks/use-wishlist'
import { useShareRecord } from '@/application/hooks/use-share-record'
import { useAxisLevel } from '@/application/hooks/use-axis-level'
import { useBubbleFeed } from '@/application/hooks/use-bubble-feed'
import { useBubbleDetail } from '@/application/hooks/use-bubble-detail'
import { BubbleMiniHeader } from '@/presentation/components/bubble/bubble-mini-header'
import { wineRepo, recordRepo, xpRepo } from '@/shared/di/container'
import { AxisLevelBadge } from '@/presentation/components/detail/axis-level-badge'
import { HeroCarousel } from '@/presentation/components/detail/hero-carousel'
import { DetailFab } from '@/presentation/components/detail/detail-fab'
import { RatingInput } from '@/presentation/components/record/rating-input'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { WineTypeChip } from '@/presentation/components/detail/wine-type-chip'
import { AromaWheel } from '@/presentation/components/record/aroma-wheel'
import { WineStructureEval } from '@/presentation/components/record/wine-structure-eval'
import { DeleteConfirmModal } from '@/presentation/components/record/delete-confirm-modal'
import { ShareToBubbleSheet } from '@/presentation/components/share/share-to-bubble-sheet'
import { Toast } from '@/presentation/components/ui/toast'
import { WINE_TYPE_LABELS } from '@/domain/entities/wine'
import type { AromaSelection } from '@/domain/entities/aroma'
import type { WineStructure } from '@/domain/entities/wine-structure'

interface WineDetailContainerProps {
  wineId: string
  bubbleId: string | null
}

function Divider() {
  return <div style={{ height: '8px', backgroundColor: 'var(--bg-elevated)' }} />
}

/** 가격 포맷 */
function formatPrice(price: number): string {
  if (price >= 10000) return `${Math.round(price / 10000)}만원`
  return `${price.toLocaleString()}원`
}

const BODY_LABELS: Record<number, string> = { 1: 'Light', 2: 'Medium-', 3: 'Medium', 4: 'Medium+', 5: 'Full' }
const ACIDITY_LABELS: Record<number, string> = { 1: '낮음', 2: '약간 낮음', 3: '보통', 4: '높음', 5: '매우 높음' }
const SWEETNESS_LABELS: Record<number, string> = { 1: 'Dry', 2: 'Off-dry', 3: 'Medium', 4: 'Sweet', 5: 'Luscious' }

export function WineDetailContainer({ wineId, bubbleId }: WineDetailContainerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const {
    wine,
    myRecords,
    recordPhotos,
    quadrantRefs,
    linkedRestaurants,
    isLoading,
    tastingCount,
    latestTastingDate,
  } = useWineDetail(wineId, user?.id ?? null, wineRepo)

  const { isWishlisted, toggle: toggleWishlist } = useWishlist(
    user?.id ?? null, wineId, 'wine', recordRepo,
  )

  const { availableBubbles, shareToBubbles, canShare, blockReason } = useShareRecord(user?.id ?? null, selectedRecordId)

  // 세부 축 레벨 (산지, 품종)
  const bestVariety = wine?.variety ?? (wine?.grapeVarieties?.[0]?.name ?? null)
  const axisLevels = useAxisLevel(user?.id ?? null, [
    { axisType: 'wine_region', axisValue: wine?.region ?? null },
    { axisType: 'wine_variety', axisValue: bestVariety },
  ])

  // ─── 기록 액션 ───
  const handleRecordEdit = useCallback(() => {
    const rid = selectedRecordId ?? myRecords[0]?.id
    if (!rid) return
    const meta = [wine?.wineType ? WINE_TYPE_LABELS[wine.wineType] : null, wine?.region].filter(Boolean).join(' · ')
    router.push(
      `/record?type=wine&targetId=${wineId}&name=${encodeURIComponent(wine?.name ?? '')}&meta=${encodeURIComponent(meta)}&edit=${rid}&from=detail`,
    )
  }, [selectedRecordId, myRecords, wine, wineId, router])

  const handleRecordShare = useCallback(() => {
    if (!canShare) {
      setToastMsg(blockReason ?? '비공개 프로필은 공유할 수 없습니다')
    } else {
      setShowShareSheet(true)
    }
  }, [canShare, blockReason])

  const handleRecordDelete = useCallback(async () => {
    if (!selectedRecordId || !user) return
    setIsDeleting(true)
    try {
      await recordRepo.delete(selectedRecordId)
      const histories = await xpRepo.getHistoriesByRecord(selectedRecordId)
      if (histories.length > 0) {
        let totalXpToDeduct = 0
        for (const h of histories) totalXpToDeduct += h.xpAmount
        await xpRepo.updateUserTotalXp(user.id, -totalXpToDeduct)
        await xpRepo.deleteByRecordId(selectedRecordId)
      }
      setShowDeleteConfirm(false)
      setSelectedRecordId(null)
      router.refresh()
    } catch {
      setToastMsg('삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
    }
  }, [selectedRecordId, user, router])

  // ─── 버블 모드 ───
  const isBubbleMode = bubbleId != null
  const { bubble: bubbleInfo } = useBubbleDetail(bubbleId, user?.id ?? null)
  const { shares: bubbleFeedShares } = useBubbleFeed(
    bubbleId,
    isBubbleMode ? 'member' : null,
    'rating_and_comment',
  )
  const bubbleMemberShares = useMemo(() => {
    if (!isBubbleMode) return []
    return bubbleFeedShares.filter((s) => s.targetId === wineId)
  }, [isBubbleMode, bubbleFeedShares, wineId])

  const bubbleRefPoints = useMemo(() => {
    return bubbleMemberShares
      .filter((s) => s.axisX != null && s.axisY != null && s.satisfaction != null)
      .map((s) => {
        const isMe = s.sharedBy === user?.id
        return {
          x: s.axisX!,
          y: s.axisY!,
          satisfaction: isMe ? s.satisfaction! : 0,
          name: s.authorName ?? '',
          score: s.satisfaction!,
        }
      })
  }, [bubbleMemberShares, user?.id])

  const bubbleMemberAvg = useMemo(() => {
    const rated = bubbleMemberShares.filter((s) => s.satisfaction != null)
    if (rated.length === 0) return null
    return Math.round(rated.reduce((sum, s) => sum + (s.satisfaction ?? 0), 0) / rated.length)
  }, [bubbleMemberShares])

  // ─── 사분면: 모든 방문 dot ───
  const allRecordDots = myRecords
    .filter((r) => r.axisX !== null && r.axisY !== null && r.satisfaction !== null)
    .map((r) => ({
      targetId: r.id,
      targetName: r.visitDate ?? r.createdAt.split('T')[0],
      avgAxisX: r.axisX!,
      avgAxisY: r.axisY!,
      avgSatisfaction: r.satisfaction!,
    }))

  const currentDot = allRecordDots.length > 0
    ? {
        axisX: Math.round(allRecordDots.reduce((s, d) => s + d.avgAxisX, 0) / allRecordDots.length),
        axisY: Math.round(allRecordDots.reduce((s, d) => s + d.avgAxisY, 0) / allRecordDots.length),
        satisfaction: Math.round(allRecordDots.reduce((s, d) => s + d.avgSatisfaction, 0) / allRecordDots.length),
      }
    : null

  // ─── 향 휠 합산 ───
  const mergedAroma: AromaSelection = useMemo(() => {
    const regions: Record<string, number> = {}
    const labelSet = new Set<string>()
    let colorR = 0, colorG = 0, colorB = 0, colorCount = 0
    for (const r of myRecords) {
      if (r.aromaRegions) {
        for (const [key, val] of Object.entries(r.aromaRegions as Record<string, number>)) {
          regions[key] = Math.max(regions[key] ?? 0, val)
        }
      }
      if (r.aromaLabels) for (const l of r.aromaLabels) labelSet.add(l)
      if (r.aromaColor) {
        const hex = r.aromaColor.replace('#', '')
        colorR += parseInt(hex.substring(0, 2), 16)
        colorG += parseInt(hex.substring(2, 4), 16)
        colorB += parseInt(hex.substring(4, 6), 16)
        colorCount++
      }
    }
    const avgColor = colorCount > 0
      ? `#${Math.round(colorR / colorCount).toString(16).padStart(2, '0')}${Math.round(colorG / colorCount).toString(16).padStart(2, '0')}${Math.round(colorB / colorCount).toString(16).padStart(2, '0')}`
      : null
    return { regions, labels: [...labelSet], color: avgColor }
  }, [myRecords])

  // ─── 구조 평가 평균 ───
  const mergedStructure: WineStructure = useMemo(() => {
    const recordsWithComplexity = myRecords.filter((r) => r.complexity !== null)
    if (recordsWithComplexity.length === 0) return { complexity: 30, finish: 50, balance: 50 }
    return {
      complexity: Math.round(recordsWithComplexity.reduce((s, r) => s + (r.complexity ?? 30), 0) / recordsWithComplexity.length),
      finish: Math.round(recordsWithComplexity.reduce((s, r) => s + (r.finish ?? 50), 0) / recordsWithComplexity.length),
      balance: Math.round(recordsWithComplexity.reduce((s, r) => s + (r.balance ?? 50), 0) / recordsWithComplexity.length),
    }
  }, [myRecords])

  const hasAromaData = Object.keys(mergedAroma.regions).length > 0
  const hasStructureData = myRecords.some((r) => r.complexity !== null)

  // ─── 히어로 사진 ───
  const heroPhotos = useMemo(() => {
    if (!wine) return []
    if (wine.photos.length > 0) return wine.photos
    if (wine.labelImageUrl) return [wine.labelImageUrl]
    const urls: string[] = []
    recordPhotos.forEach((photos) => { for (const p of photos) urls.push(p.url) })
    return urls
  }, [wine, recordPhotos])

  // ─── 콜백 ───
  const handleBack = useCallback(() => router.back(), [router])
  const handleAdd = useCallback(() => {
    const meta = [wine?.wineType ? WINE_TYPE_LABELS[wine.wineType] : null, wine?.region, wine?.vintage].filter(Boolean).join(' · ')
    router.push(`/record?type=wine&targetId=${wineId}&name=${encodeURIComponent(wine?.name ?? '')}&meta=${encodeURIComponent(meta)}&from=detail`)
  }, [router, wineId, wine])
  const handlePageShare = useCallback(() => {
    if (navigator.share) navigator.share({ title: wine?.name, url: window.location.href })
  }, [wine])

  if (isLoading || !wine) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-wine)] border-t-transparent" />
      </div>
    )
  }

  // ─── 블렌드 품종 텍스트 ───
  const mainVariety = wine.variety
  const blendText = wine.grapeVarieties.length > 1
    ? wine.grapeVarieties
        .filter((g) => g.name !== mainVariety)
        .map((g) => g.pct > 0 ? `${g.name} ${g.pct}%` : g.name)
        .join(', ')
    : null

  // ─── 와인 정보 compact rows ───
  const infoItems: { label: string; value: string }[] = []
  if (wine.abv) infoItems.push({ label: 'ABV', value: `${wine.abv}%` })
  if (wine.bodyLevel) infoItems.push({ label: 'Body', value: BODY_LABELS[wine.bodyLevel] ?? '' })
  if (wine.acidityLevel) infoItems.push({ label: 'Acidity', value: ACIDITY_LABELS[wine.acidityLevel] ?? '' })
  if (wine.sweetnessLevel) infoItems.push({ label: 'Sweet', value: SWEETNESS_LABELS[wine.sweetnessLevel] ?? '' })
  if (wine.servingTemp) infoItems.push({ label: 'Temp', value: wine.servingTemp })
  if (wine.decanting) infoItems.push({ label: 'Decant', value: wine.decanting })
  if (wine.drinkingWindowStart && wine.drinkingWindowEnd) {
    infoItems.push({ label: 'Drink', value: `${wine.drinkingWindowStart}–${wine.drinkingWindowEnd}` })
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
          fallbackIcon="wine"
          isWishlisted={isWishlisted}
          onWishlistToggle={toggleWishlist}
          onShare={handlePageShare}
        />

        {/* ════════════════════════════════════════
            기본 섹션
           ════════════════════════════════════════ */}
        <section style={{ padding: '14px 20px 0' }}>

          {/* #1 와인명 · 빈티지 */}
          <h1 style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
            {wine.name}
            {wine.vintage && (
              <span style={{ fontWeight: 600, color: 'var(--text-sub)', marginLeft: '6px' }}>
                {wine.vintage}
              </span>
            )}
          </h1>

          {/* #2 스타일 스티커 + 와이너리 */}
          <div className="mt-1.5 flex items-center gap-2">
            <WineTypeChip wineType={wine.wineType} />
            {wine.producer && (
              <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{wine.producer}</span>
            )}
          </div>

          {/* #3 국가(칩) · 세부산지 */}
          {(wine.country || wine.region) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {wine.country && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1"
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: 'color-mix(in srgb, var(--accent-wine) 12%, transparent)',
                    color: 'var(--accent-wine)',
                  }}
                >
                  <MapPin size={11} />
                  {wine.country}
                </span>
              )}
              {(wine.region || wine.subRegion) && (
                <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                  {[wine.region, wine.subRegion].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          )}

          {/* #4 대표품종(칩) · 블렌드 품종 */}
          {mainVariety && (
            <div className="mt-2 flex flex-wrap items-center gap-2 pb-4">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: 'color-mix(in srgb, var(--accent-wine) 12%, transparent)',
                  color: 'var(--accent-wine)',
                }}
              >
                <Grape size={11} />
                {mainVariety}
              </span>
              {blendText && (
                <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
                  + {blendText}
                </span>
              )}
            </div>
          )}
        </section>

        <Divider />

        {/* ════════════════════════════════════════
            와인 정보 (compact) + AI 분석
           ════════════════════════════════════════ */}
        <section style={{ padding: '14px 20px' }}>
          <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            와인 정보
          </h3>

          {/* compact 스펙 그리드 */}
          {infoItems.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-x-2 gap-y-2">
              {infoItems.map((item) => (
                <div key={item.label} className="rounded-lg px-2.5 py-2" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-hint)', textTransform: 'uppercase' }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '1px' }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 외부 평점 */}
          {(wine.vivinoRating || wine.classification) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {wine.vivinoRating && (
                <span className="rounded-full px-2.5 py-1" style={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'var(--bg-card)', color: 'var(--text)' }}>
                  Vivino {wine.vivinoRating}
                </span>
              )}
              {wine.classification && (
                <span className="rounded-full px-2.5 py-1" style={{ fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)' }}>
                  {wine.classification}
                </span>
              )}
              {wine.criticScores?.RP && (
                <span className="rounded-full px-2.5 py-1" style={{ fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)' }}>
                  RP {wine.criticScores.RP}
                </span>
              )}
              {wine.criticScores?.WS && (
                <span className="rounded-full px-2.5 py-1" style={{ fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)' }}>
                  WS {wine.criticScores.WS}
                </span>
              )}
            </div>
          )}

          {/* 적정 구입가 */}
          {wine.referencePrice && (
            <div className="mb-3 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--bg-card)' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-hint)' }}>적정 구입가</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-wine)', marginTop: '2px' }}>
                {formatPrice(wine.referencePrice)}
              </p>
            </div>
          )}

          {/* 음식 페어링 */}
          {wine.foodPairings.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {wine.foodPairings.map((f) => (
                <span
                  key={f}
                  className="rounded-full px-2 py-0.5"
                  style={{ fontSize: '11px', fontWeight: 500, backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)' }}
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </section>

        <Divider />

        {/* ════════════════════════════════════════
            나의 기록
           ════════════════════════════════════════ */}
        <section style={{ padding: '16px 20px' }}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>나의 기록</h3>
              {axisLevels.length > 0 && myRecords.length > 0 && axisLevels.map((al) => (
                <AxisLevelBadge key={al.axisValue} axisLabel={al.axisValue} level={al.level} />
              ))}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
              {tastingCount > 0 ? `${tastingCount}회 시음 · ${latestTastingDate ?? ''}` : '아직 기록이 없어요'}
            </span>
          </div>

          {(tastingCount > 0 || (isBubbleMode && bubbleRefPoints.length > 0)) && (
            <div className="flex flex-col gap-6">
              {/* 사분면 — 버블 모드: 멤버 dots / 일반 모드: 내 기록 dots */}
              {isBubbleMode && bubbleRefPoints.length > 0 ? (
                <RatingInput
                  type="wine"
                  value={currentDot
                    ? { x: currentDot.axisX, y: currentDot.axisY, satisfaction: currentDot.satisfaction }
                    : { x: 50, y: 50 }
                  }
                  onChange={() => {}}
                  readOnly
                  hideDot={!currentDot}
                  referencePoints={bubbleRefPoints}
                />
              ) : currentDot ? (
                <RatingInput
                  type="wine"
                  value={{ x: currentDot.axisX, y: currentDot.axisY, satisfaction: currentDot.satisfaction }}
                  onChange={() => {}}
                  readOnly
                  referencePoints={[...allRecordDots, ...quadrantRefs].map((d) => ({
                    x: d.avgAxisX,
                    y: d.avgAxisY,
                    satisfaction: d.avgSatisfaction,
                    name: d.targetName,
                    score: d.avgSatisfaction,
                  }))}
                />
              ) : null}

              {/* 향 휠 */}
              {hasAromaData && (
                <div>
                  <p className="mb-2" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>
                    향 프로필
                    <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)', marginLeft: '6px' }}>
                      {tastingCount}회 누적
                    </span>
                  </p>
                  <AromaWheel value={mergedAroma} readOnly />
                </div>
              )}

              {/* 구조 평가 — 기록할 때 쓰는 슬라이더 그대로 */}
              {hasStructureData && (
                <div>
                  <p className="mb-2" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>
                    구조 평가
                    <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)', marginLeft: '6px' }}>평균</span>
                  </p>
                  <WineStructureEval
                    value={mergedStructure}
                    onChange={() => {}}
                    aromaRingCount={0}
                    onAutoScoreChange={() => {}}
                  />
                </div>
              )}
            </div>
          )}
        </section>

        <Divider />

        {/* ════════════════════════════════════════
            기록 히스토리
           ════════════════════════════════════════ */}
        <section style={{ padding: '16px 20px' }}>
          <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>기록 히스토리</h3>

          {myRecords.length === 0 ? (
            <p className="py-6 text-center" style={{ fontSize: '13px', color: 'var(--text-hint)' }}>
              아직 기록이 없어요
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {myRecords.map((record) => {
                const photos = recordPhotos.get(record.id)
                const firstPhoto = photos?.[0]?.url
                const linkedName = record.linkedRestaurantId
                  ? linkedRestaurants.find((r) => r.restaurantId === record.linkedRestaurantId)?.restaurantName
                  : null

                return (
                  <button
                    type="button"
                    key={record.id}
                    onClick={() => { setSelectedRecordId(record.id); handleRecordEdit() }}
                    className="flex w-full items-start gap-3 rounded-xl p-3 text-left"
                    style={{ backgroundColor: 'var(--bg-card)' }}
                  >
                    {firstPhoto && (
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={firstPhoto} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                          {record.visitDate ?? record.createdAt.split('T')[0]}
                        </span>
                        {record.satisfaction !== null && (
                          <span
                            className="rounded-full px-2 py-0.5"
                            style={{
                              fontSize: '11px', fontWeight: 700,
                              backgroundColor: 'color-mix(in srgb, var(--accent-wine) 12%, transparent)',
                              color: 'var(--accent-wine)',
                            }}
                          >
                            {record.satisfaction}점
                          </span>
                        )}
                      </div>
                      {record.comment && (
                        <p className="mt-1 line-clamp-2" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                          {record.comment}
                        </p>
                      )}
                      {linkedName && (
                        <p className="mt-1" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
                          📍 {linkedName}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div style={{ height: '80px' }} />
      </div>

      {/* FAB + 액션 버튼 — 같은 높이 */}
      <DetailFab onBack={handleBack} onAdd={handleAdd} variant="wine" />

      {myRecords.length > 0 && (
        <FabActions
          variant="wine"
          onEdit={handleRecordEdit}
          onShare={handleRecordShare}
          onDelete={() => { setSelectedRecordId(myRecords[0]?.id ?? null); setShowDeleteConfirm(true) }}
        />
      )}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        isDeleting={isDeleting}
        onConfirm={handleRecordDelete}
        onCancel={() => { setShowDeleteConfirm(false); setSelectedRecordId(null) }}
      />
      <ShareToBubbleSheet
        isOpen={showShareSheet}
        onClose={() => { setShowShareSheet(false); setSelectedRecordId(null) }}
        bubbles={availableBubbles}
        onShareMultiple={shareToBubbles}
      />
      <Toast message={toastMsg ?? ''} visible={!!toastMsg} onHide={() => setToastMsg(null)} />
    </div>
  )
}
