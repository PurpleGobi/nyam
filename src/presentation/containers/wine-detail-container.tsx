'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useWineDetail } from '@/application/hooks/use-wine-detail'
import { useWishlist } from '@/application/hooks/use-wishlist'
import { HeroCarousel } from '@/presentation/components/detail/hero-carousel'
import { ScoreCards } from '@/presentation/components/detail/score-cards'
import { RecordTimeline } from '@/presentation/components/detail/record-timeline'
import { QuadrantDisplay } from '@/presentation/components/detail/quadrant-display'
import { DetailFab } from '@/presentation/components/detail/detail-fab'
import { WineTypeChip } from '@/presentation/components/detail/wine-type-chip'
import { WineFactsTable } from '@/presentation/components/detail/wine-facts-table'
import { FoodPairingTags } from '@/presentation/components/detail/food-pairing-tags'
import { WINE_TYPE_LABELS } from '@/domain/entities/wine'

interface WineDetailContainerProps {
  wineId: string
}

export function WineDetailContainer({ wineId }: WineDetailContainerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { wine, myRecords, myAvgScore, isLoading } = useWineDetail(wineId, user?.id ?? null)
  const { isWishlisted, toggle: toggleWishlist } = useWishlist(user?.id ?? null, wineId, 'wine')

  const quadrantPoints = myRecords
    .filter((r) => r.axisX !== null && r.axisY !== null && r.satisfaction !== null)
    .map((r) => ({
      x: r.axisX as number,
      y: r.axisY as number,
      satisfaction: r.satisfaction as number,
      name: wine?.name ?? '',
      score: r.satisfaction as number,
    }))

  const handleRecordClick = useCallback(
    (recordId: string) => router.push(`/records/${recordId}`),
    [router],
  )
  const handleBack = useCallback(() => router.back(), [router])
  const handleAdd = useCallback(() => {
    router.push(`/record?type=wine&targetId=${wineId}&name=${encodeURIComponent(wine?.name ?? '')}&meta=${encodeURIComponent([wine?.wineType ? WINE_TYPE_LABELS[wine.wineType] : null, wine?.region, wine?.vintage].filter(Boolean).join(' · '))}&from=detail`)
  }, [router, wineId, wine])

  if (isLoading || !wine) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-wine)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] pb-20">
      <DetailFab variant="wine" onBack={handleBack} onAdd={handleAdd} />

      <HeroCarousel
        photos={wine.photos ?? (wine.labelImageUrl ? [wine.labelImageUrl] : [])}
        fallbackIcon="wine"
        isWishlisted={isWishlisted}
        onWishlistToggle={toggleWishlist}
      />

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{wine.name}</h1>
          <WineTypeChip wineType={wine.wineType} />
        </div>
        <p className="mt-0.5" style={{ fontSize: '14px', color: 'var(--text-sub)' }}>
          {[wine.producer, wine.region, wine.vintage].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="py-3">
        <ScoreCards
          slots={[
            { label: '내 평균', value: myAvgScore },
            { label: '시음 횟수', value: myRecords.length, suffix: '회' },
            { label: 'Nyam 점수', value: wine.nyamScore ? Math.round(wine.nyamScore) : null },
          ]}
        />
      </div>

      <section className="py-3">
        <h3 className="mb-2 px-4" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          내 기록
        </h3>
        <RecordTimeline records={myRecords} onRecordClick={handleRecordClick} />
      </section>

      {quadrantPoints.length >= 2 && (
        <section className="py-3">
          <h3 className="mb-2 px-4" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            내 포지션 맵
          </h3>
          <QuadrantDisplay type="wine" points={quadrantPoints.slice(1)} currentPoint={quadrantPoints[0]} />
        </section>
      )}

      {/* L5b: Food Pairing Tags */}
      {wine.foodPairings && wine.foodPairings.length > 0 && (
        <section className="py-3">
          <h3 className="mb-2 px-4" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            페어링
          </h3>
          <div className="px-4">
            <FoodPairingTags pairings={wine.foodPairings} />
          </div>
        </section>
      )}

      {/* L7: Wine Facts */}
      <section className="py-3">
        <h3 className="mb-2 px-4" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          와인 정보
        </h3>
        <div className="px-4">
          <WineFactsTable wine={wine} />
        </div>
      </section>
    </div>
  )
}
