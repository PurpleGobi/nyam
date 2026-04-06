'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Grape, Thermometer, GlassWater, CalendarRange, UtensilsCrossed, Info, X, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { FabActions } from '@/presentation/components/layout/fab-actions'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useWineDetail } from '@/application/hooks/use-wine-detail'
import { useWishlist } from '@/application/hooks/use-wishlist'
import { useShareRecord } from '@/application/hooks/use-share-record'
import { useAxisLevel } from '@/application/hooks/use-axis-level'
import { useBubbleFeed } from '@/application/hooks/use-bubble-feed'
import { useBubbleDetail } from '@/application/hooks/use-bubble-detail'
import { BubbleMiniHeader } from '@/presentation/components/bubble/bubble-mini-header'
import { useTargetScores } from '@/application/hooks/use-target-scores'
import { useDeleteRecord } from '@/application/hooks/use-delete-record'
import { AxisLevelBadge } from '@/presentation/components/detail/axis-level-badge'
import { ScoreCards } from '@/presentation/components/detail/score-cards'
import { HeroCarousel } from '@/presentation/components/detail/hero-carousel'
import { DetailFab } from '@/presentation/components/detail/detail-fab'
import { RatingInput } from '@/presentation/components/record/rating-input'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { WineTypeChip } from '@/presentation/components/detail/wine-type-chip'
import { AromaWheel } from '@/presentation/components/record/aroma-wheel'
import { WineStructureEval } from '@/presentation/components/record/wine-structure-eval'
import { DeleteConfirmModal } from '@/presentation/components/record/delete-confirm-modal'
import { ShareToBubbleSheet } from '@/presentation/components/share/share-to-bubble-sheet'
import { useToast } from '@/presentation/components/ui/toast'
import { WINE_TYPE_LABELS } from '@/domain/entities/wine'
import type { AromaSelection, AromaSectorId } from '@/domain/entities/aroma'
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
  const [focusedRecordIdx, setFocusedRecordIdx] = useState(0)
  const { showToast } = useToast()
  const { deleteRecord, isDeleting } = useDeleteRecord()
  const [showPriceReview, setShowPriceReview] = useState(false)

  const {
    wine,
    myRecords,
    recordPhotos,
    quadrantRefs,
    linkedRestaurants,
    bubbleScores,
    followingRecords,
    publicRecords,
    isLoading,
    tastingCount,
    latestTastingDate,
    myAvgScore,
    bubbleAvgScore,
    bubbleCount,
    followingAvgScore,
    followingCount,
    nyamAvgScore,
    nyamCount,
  } = useWineDetail(wineId, user?.id ?? null)

  const {
    cards: scoreCards,
    selectedSources,
    quadrantMode,
    toggleSource,
    setQuadrantMode,
    isCardToggleActive,
  } = useTargetScores({
    myAvgScore,
    myCount: tastingCount,
    followingAvgScore,
    followingCount,
    bubbleAvgScore,
    bubbleCount,
    nyamAvgScore,
    nyamCount,
  })

  const { isWishlisted, toggle: toggleWishlist } = useWishlist(
    user?.id ?? null, wineId, 'wine',
  )

  // 세부 축 레벨 (산지, 품종)
  const bestVariety = wine?.variety ?? (wine?.grapeVarieties?.[0]?.name ?? null)
  const axisLevels = useAxisLevel(user?.id ?? null, [
    { axisType: 'wine_region', axisValue: wine?.region ?? null },
    { axisType: 'wine_variety', axisValue: bestVariety },
  ])

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

  // ─── 사분면: 모든 방문 dot ───
  const allRecordsWithAxis = myRecords
    .filter((r) => r.axisX !== null && r.axisY !== null && r.satisfaction !== null)
  const allRecordDots = allRecordsWithAxis
    .map((r) => ({
      targetId: r.id,
      targetName: r.visitDate ?? r.createdAt.split('T')[0],
      avgAxisX: r.axisX!,
      avgAxisY: r.axisY!,
      avgSatisfaction: r.satisfaction!,
    }))

  const avgDot = allRecordDots.length > 0
    ? {
        axisX: Math.round(allRecordDots.reduce((s, d) => s + d.avgAxisX, 0) / allRecordDots.length),
        axisY: Math.round(allRecordDots.reduce((s, d) => s + d.avgAxisY, 0) / allRecordDots.length),
        satisfaction: Math.round(allRecordDots.reduce((s, d) => s + d.avgSatisfaction, 0) / allRecordDots.length),
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
        _refIdx: i,
      })),
    [sortedRecords, focusedRecordIdx],
  )

  // visits 모드에서 selectedSources에 따른 타인 micro dot (멀티셀렉트)
  const visitsRefPoints = useMemo(() => {
    const myRefs = selectedSources.includes('my') ? otherRecordRefs : []

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

  const activeRecordId = quadrantMode === 'visits' && focusedRecord
    ? focusedRecord.id
    : selectedRecordId ?? myRecords[0]?.id ?? null
  const { availableBubbles, shareToBubbles, canShare, blockReason } = useShareRecord(user?.id ?? null, activeRecordId)

  // ─── 기록 액션 ───
  const handleRecordEdit = useCallback(() => {
    if (!activeRecordId) return
    const meta = [wine?.wineType ? WINE_TYPE_LABELS[wine.wineType] : null, wine?.region].filter(Boolean).join(' · ')
    router.push(
      `/record?type=wine&targetId=${wineId}&name=${encodeURIComponent(wine?.name ?? '')}&meta=${encodeURIComponent(meta)}&edit=${activeRecordId}&from=detail`,
    )
  }, [activeRecordId, wine, wineId, router])

  const handleRecordShare = useCallback(() => {
    if (!canShare) {
      showToast(blockReason ?? '비공개 프로필은 공유할 수 없습니다')
    } else {
      setShowShareSheet(true)
    }
  }, [canShare, blockReason, showToast])

  const handleRecordDelete = useCallback(async () => {
    if (!activeRecordId || !user) return
    try {
      const result = await deleteRecord(activeRecordId, user.id, wineId, 'wine')

      setShowDeleteConfirm(false)
      setSelectedRecordId(null)
      showToast('기록이 삭제되었습니다')
      if (result.sharesCount > 0) {
        showToast(`${result.sharesCount}개 버블 공유도 함께 삭제되었습니다`)
      }
      if (result.remainingCount > 0) {
        showToast(`이 와인의 기록이 ${result.remainingCount}건 남아있습니다`)
      }

      router.replace('/')
    } catch {
      showToast('삭제에 실패했습니다')
    }
  }, [activeRecordId, user, router, wineId, showToast, deleteRecord])

  // ─── 향 휠 합산 ───
  const mergedAroma: AromaSelection = useMemo(() => {
    const primarySet = new Set<string>()
    const secondarySet = new Set<string>()
    const tertiarySet = new Set<string>()
    for (const r of myRecords) {
      for (const id of r.aromaPrimary) primarySet.add(id)
      for (const id of r.aromaSecondary) secondarySet.add(id)
      for (const id of r.aromaTertiary) tertiarySet.add(id)
    }
    return {
      primary: [...primarySet] as AromaSectorId[],
      secondary: [...secondarySet] as AromaSectorId[],
      tertiary: [...tertiarySet] as AromaSectorId[],
    }
  }, [myRecords])

  // ─── 품질 평가 평균 ───
  const mergedStructure: WineStructure = useMemo(() => {
    const recordsWithComplexity = myRecords.filter((r) => r.complexity !== null)
    if (recordsWithComplexity.length === 0) return { balance: 50, finish: 50, intensity: 50, complexity: 30 }
    return {
      balance: Math.round(recordsWithComplexity.reduce((s, r) => s + (r.balance ?? 50), 0) / recordsWithComplexity.length),
      finish: Math.round(recordsWithComplexity.reduce((s, r) => s + (r.finish ?? 50), 0) / recordsWithComplexity.length),
      intensity: Math.round(recordsWithComplexity.reduce((s, r) => s + (r.intensity ?? 50), 0) / recordsWithComplexity.length),
      complexity: Math.round(recordsWithComplexity.reduce((s, r) => s + (r.complexity ?? 30), 0) / recordsWithComplexity.length),
    }
  }, [myRecords])

  const hasAromaData = mergedAroma.primary.length > 0 || mergedAroma.secondary.length > 0 || mergedAroma.tertiary.length > 0
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
            기본 정보 (수정 페이지와 동일 순서)
           ════════════════════════════════════════ */}
        <section style={{ padding: '14px 20px 0' }}>

          {/* 1행: 와인명 [스타일뱃지] + Classification/Vivino/RP/적정가 */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="flex items-center gap-1.5" style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
                <span className="truncate">{wine.name}</span>
                <WineTypeChip wineType={wine.wineType} />
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5" style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
                {wine.vintage && <span>{wine.vintage}</span>}
                {wine.producer && <span>{wine.producer}</span>}
              </div>
            </div>
            {(wine.classification || wine.vivinoRating || wine.criticScores?.RP || wine.criticScores?.WS) && (
              <div className="flex shrink-0 items-center gap-2">
                {wine.classification && (
                  <span className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-sub)' }}>
                    {wine.classification}
                  </span>
                )}
                {wine.vivinoRating && (
                  <div className="flex items-baseline gap-0.5">
                    <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>Vivino</span>
                    <span className="text-[18px] font-bold" style={{ color: 'var(--text-sub)' }}>{wine.vivinoRating}</span>
                  </div>
                )}
                {wine.criticScores?.RP && (
                  <div className="flex items-baseline gap-0.5">
                    <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>RP</span>
                    <span className="text-[18px] font-bold" style={{ color: 'var(--text-sub)' }}>{wine.criticScores.RP}</span>
                  </div>
                )}
                {wine.criticScores?.WS && (
                  <div className="flex items-baseline gap-0.5">
                    <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>WS</span>
                    <span className="text-[18px] font-bold" style={{ color: 'var(--text-sub)' }}>{wine.criticScores.WS}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 적정가 (우측 상단 2행) */}
          {(wine.referencePriceMin || wine.referencePriceMax) && (
            <div className="mt-0.5 flex items-center justify-end gap-1">
              <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>적정가</span>
              <span className="text-[13px] font-bold" style={{ color: 'var(--accent-wine)' }}>
                {wine.referencePriceMin && wine.referencePriceMax
                  ? `${formatPrice(wine.referencePriceMin)}~${formatPrice(wine.referencePriceMax)}`
                  : formatPrice(wine.referencePriceMin ?? wine.referencePriceMax ?? 0)}
              </span>
              {wine.priceReview && (
                <button
                  type="button"
                  onClick={() => setShowPriceReview(true)}
                  className="flex items-center gap-0.5"
                  style={{ padding: '3px 8px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--bg-elevated)', cursor: 'pointer' }}
                >
                  <Info size={11} style={{ color: 'var(--text-sub)' }} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-sub)' }}>추가정보</span>
                </button>
              )}
            </div>
          )}

          <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '10px 0' }} />

          {/* 2행: Country › Region › Sub-region + 산지 레벨 */}
          {(wine.country || wine.region) && (
            <div className="flex flex-wrap items-center gap-1 py-1" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
              {wine.country && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: '12px', fontWeight: 700, backgroundColor: 'color-mix(in srgb, var(--accent-wine) 12%, transparent)', color: 'var(--accent-wine)' }}>
                  <MapPin size={11} />
                  {wine.country}
                </span>
              )}
              {wine.region && (
                <>
                  <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>›</span>
                  <span>{wine.region}</span>
                </>
              )}
              {(wine.subRegion || wine.appellation) && (
                <>
                  <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>›</span>
                  <span>{wine.subRegion ?? wine.appellation}</span>
                </>
              )}
              {axisLevels.find((al) => al.axisValue === wine.region) && (
                <AxisLevelBadge level={axisLevels.find((al) => al.axisValue === wine.region)!.level} />
              )}
            </div>
          )}

          {/* 3행: 품종 칩 + 품종 레벨 */}
          {mainVariety && (
            <div className="flex flex-wrap items-center gap-1 py-1">
              {wine.grapeVarieties.length > 0 ? (
                wine.grapeVarieties.map((g) => (
                  <span
                    key={g.name}
                    className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-medium"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--accent-wine) 10%, transparent)', color: 'var(--accent-wine)' }}
                  >
                    <Grape size={11} />
                    {g.name}
                    {g.pct > 0 && g.pct < 100 && (
                      <span style={{ fontSize: '10px', opacity: 0.55 }}>{g.pct}%</span>
                    )}
                  </span>
                ))
              ) : (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--accent-wine) 10%, transparent)', color: 'var(--accent-wine)' }}
                >
                  <Grape size={11} />
                  {mainVariety}
                </span>
              )}
              {axisLevels.find((al) => al.axisValue === bestVariety) && (
                <AxisLevelBadge level={axisLevels.find((al) => al.axisValue === bestVariety)!.level} />
              )}
            </div>
          )}

          {/* 4행: Body | Acidity | Sweet | ABV */}
          {(wine.bodyLevel || wine.acidityLevel || wine.sweetnessLevel || wine.abv) && (
            <div className="flex flex-wrap items-baseline gap-1.5 py-1 text-[13px] font-medium" style={{ color: 'var(--text)' }}>
              {wine.bodyLevel && <span>{BODY_LABELS[wine.bodyLevel]} Body</span>}
              {wine.bodyLevel && wine.acidityLevel && <span style={{ color: 'var(--border)' }}>|</span>}
              {wine.acidityLevel && <span>{ACIDITY_LABELS[wine.acidityLevel]} Acid</span>}
              {wine.acidityLevel && wine.sweetnessLevel && <span style={{ color: 'var(--border)' }}>|</span>}
              {wine.sweetnessLevel && <span>{SWEETNESS_LABELS[wine.sweetnessLevel]}</span>}
              {wine.sweetnessLevel && wine.abv && <span style={{ color: 'var(--border)' }}>|</span>}
              {wine.abv && <span>ABV {wine.abv}%</span>}
            </div>
          )}

          {/* 5행: 서빙온도 · 디캔팅 · 음용시기 */}
          {(wine.servingTemp || wine.decanting || (wine.drinkingWindowStart && wine.drinkingWindowEnd)) && (
            <div className="flex flex-wrap items-center gap-1 py-1 text-[13px] font-medium" style={{ color: 'var(--text-sub)' }}>
              {wine.servingTemp && (
                <>
                  <Thermometer size={13} style={{ color: 'var(--text-hint)' }} />
                  <span>{wine.servingTemp}</span>
                </>
              )}
              {wine.servingTemp && wine.decanting && <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>·</span>}
              {wine.decanting && (
                <>
                  <GlassWater size={13} style={{ color: 'var(--text-hint)' }} />
                  <span><span style={{ color: 'var(--text-hint)' }}>디캔팅</span> {wine.decanting}</span>
                </>
              )}
              {(wine.servingTemp || wine.decanting) && wine.drinkingWindowStart && <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>·</span>}
              {wine.drinkingWindowStart && wine.drinkingWindowEnd && (
                <>
                  <CalendarRange size={13} style={{ color: 'var(--text-hint)' }} />
                  <span><span style={{ color: 'var(--text-hint)' }}>음용</span> {wine.drinkingWindowStart}–{wine.drinkingWindowEnd}</span>
                </>
              )}
            </div>
          )}

          {/* 6행: 푸드페어링 */}
          {wine.foodPairings.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 py-1 text-[13px] font-medium" style={{ color: 'var(--text-sub)' }}>
              <UtensilsCrossed size={13} style={{ color: 'var(--text-hint)' }} />
              <span>{wine.foodPairings.join(', ')}</span>
            </div>
          )}

          {/* 7행: 테이스팅 노트 */}
          {wine.tastingNotes && (
            <p className="py-1 text-[12px] italic leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              &ldquo;{wine.tastingNotes}&rdquo;
            </p>
          )}

          <div style={{ height: '8px' }} />
        </section>

        {/* ─── 스코어카드 + 버블 확장 ─── */}
        <ScoreCards
          accentColor="--accent-wine"
          cards={scoreCards}
          selectedSources={selectedSources}
          onToggle={toggleSource}
          toggleActive={isCardToggleActive}
        />

        <Divider />

        {/* ════════════════════════════════════════
            나의 기록
           ════════════════════════════════════════ */}
        <section style={{ padding: '16px 20px' }}>
          <div className="mb-4 flex items-center gap-2">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>나의 기록</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
              {tastingCount > 0 ? `${tastingCount}회 시음` : '아직 기록이 없어요'}
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
                  referencePoints={quadrantMode === 'compare'
                    ? quadrantRefs.map((d) => ({
                        x: d.avgAxisX,
                        y: d.avgAxisY,
                        satisfaction: d.avgSatisfaction,
                        name: d.targetName,
                        score: d.avgSatisfaction,
                        targetId: d.targetId,
                        targetType: 'wine' as const,
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

              {/* 품질 평가 — 기록할 때 쓰는 슬라이더 그대로 */}
              {hasStructureData && (
                <div>
                  <p className="mb-2" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>
                    품질 평가
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
      {/* 가격 분석 팝업 */}
      {showPriceReview && wine.priceReview && (
        <>
          <div
            className="fixed inset-0 z-[200]"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => setShowPriceReview(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[201] w-[calc(100%-40px)] max-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-5 pb-6 pt-5"
            style={{ backgroundColor: 'var(--bg)', maxHeight: '80dvh', overflowY: 'auto' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>가격 분석</h3>
              <button type="button" onClick={() => setShowPriceReview(false)} style={{ color: 'var(--text-hint)' }}>
                <X size={20} />
              </button>
            </div>

            {/* 판정 뱃지 */}
            <div className="mb-3 flex items-center gap-2">
              {wine.priceReview.verdict === 'buy' && (
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold text-white" style={{ backgroundColor: '#16a34a' }}>
                  <ShieldCheck size={15} /> 구매 추천
                </span>
              )}
              {wine.priceReview.verdict === 'conditional_buy' && (
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
                  <ShieldAlert size={15} /> 조건부 구매
                </span>
              )}
              {wine.priceReview.verdict === 'avoid' && (
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold text-white" style={{ backgroundColor: '#dc2626' }}>
                  <ShieldX size={15} /> 비추천
                </span>
              )}
            </div>

            {/* 분석 요약 */}
            <p className="mb-4 leading-relaxed" style={{ fontSize: '14px', color: 'var(--text)' }}>
              {wine.priceReview.summary}
            </p>

            {/* 대안 와인 */}
            {wine.priceReview.alternatives.length > 0 && (
              <div>
                <p className="mb-2" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-hint)' }}>
                  같은 가격대 대안
                </p>
                <div className="flex flex-col gap-2">
                  {wine.priceReview.alternatives.map((alt) => (
                    <div
                      key={alt.name}
                      className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ backgroundColor: 'var(--bg-card)' }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{alt.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-wine)' }}>{alt.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
