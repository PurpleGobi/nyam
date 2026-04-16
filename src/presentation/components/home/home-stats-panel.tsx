'use client'

import dynamic from 'next/dynamic'
import { PdLockOverlay } from '@/presentation/components/home/pd-lock-overlay'
import type { RestaurantStatsResult } from '@/application/hooks/use-restaurant-stats'
import type { WineStatsResult } from '@/application/hooks/use-wine-stats'
import { MapPin, Utensils, BarChart2, CalendarDays, Drama, Grape, Wine } from 'lucide-react'

const WorldMapChart = dynamic(() => import('@/presentation/components/home/world-map-chart').then(m => ({ default: m.WorldMapChart })), { ssr: false })
const GenreChart = dynamic(() => import('@/presentation/components/home/genre-chart').then(m => ({ default: m.GenreChart })), { ssr: false })
const ScoreDistribution = dynamic(() => import('@/presentation/components/home/score-distribution').then(m => ({ default: m.ScoreDistribution })), { ssr: false })
const MonthlyChart = dynamic(() => import('@/presentation/components/home/monthly-chart').then(m => ({ default: m.MonthlyChart })), { ssr: false })
const SceneChart = dynamic(() => import('@/presentation/components/home/scene-chart').then(m => ({ default: m.SceneChart })), { ssr: false })
const WineRegionMap = dynamic(() => import('@/presentation/components/home/wine-region-map').then(m => ({ default: m.WineRegionMap })), { ssr: false })
const VarietalChart = dynamic(() => import('@/presentation/components/home/varietal-chart').then(m => ({ default: m.VarietalChart })), { ssr: false })
const WineTypeChart = dynamic(() => import('@/presentation/components/home/wine-type-chart').then(m => ({ default: m.WineTypeChart })), { ssr: false })

interface HomeStatsPanelProps {
  activeTab: 'restaurant' | 'wine'
  restaurantStats: RestaurantStatsResult
  wineStats: WineStatsResult
  totalCountries: number
}

function formatWon(value: number): string {
  if (value >= 10000) return `${Math.round(value / 10000)}만원`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}천원`
  if (value > 0) return `${value}원`
  return '-'
}

function computeAvgScore(buckets: { label: string; count: number }[]): number | null {
  const midpoints = [25, 55, 65, 75, 85, 95]
  let total = 0
  let count = 0
  for (let i = 0; i < buckets.length; i++) {
    total += midpoints[i] * buckets[i].count
    count += buckets[i].count
  }
  return count > 0 ? Math.round(total / count) : null
}

/* ── Summary Card ── */

interface SummaryItem {
  label: string
  value: string
  sub?: string
}

function SummaryCard({ items, accentColor }: { items: SummaryItem[]; accentColor: string }) {
  return (
    <div
      className="grid gap-[1px] overflow-hidden rounded-[14px]"
      style={{
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        backgroundColor: 'var(--border)',
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center justify-center py-[14px]"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <span
            className="text-[20px] font-extrabold leading-tight"
            style={{ color: accentColor }}
          >
            {item.value}
          </span>
          {item.sub && (
            <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
              {item.sub}
            </span>
          )}
          <span className="mt-[2px] text-[11px] font-medium" style={{ color: 'var(--text-sub)' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Section Card ── */

function SectionCard({
  icon,
  title,
  accentColor,
  children,
}: {
  icon: React.ReactNode
  title: string
  accentColor: string
  children: React.ReactNode
}) {
  return (
    <div
      className="overflow-hidden rounded-[14px]"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-[6px] px-[16px] pt-[14px] pb-[10px]">
        <span style={{ color: accentColor }}>{icon}</span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </span>
      </div>
      <div className="px-[16px] pb-[16px]">
        {children}
      </div>
    </div>
  )
}

/* ── Loading Skeleton ── */

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-24">
      {/* Summary skeleton */}
      <div
        className="animate-pulse rounded-[14px]"
        style={{
          height: 80,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      />
      {/* Chart skeletons */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-[14px]"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="mx-[16px] mt-[14px] mb-[10px] rounded-[4px]"
            style={{ height: 16, width: 80, backgroundColor: 'var(--border)' }}
          />
          <div
            className="mx-[16px] mb-[16px] rounded-[8px]"
            style={{ height: i === 1 ? 160 : 120, backgroundColor: 'var(--bg-page)' }}
          />
        </div>
      ))}
    </div>
  )
}

/* ── Empty State ── */

function StatsEmpty({ type }: { type: 'restaurant' | 'wine' }) {
  const isWine = type === 'wine'
  const accentColor = isWine ? 'var(--accent-wine)' : 'var(--accent-food)'

  return (
    <div className="flex flex-col items-center gap-4 px-4 pt-8 pb-24">
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          backgroundColor: 'color-mix(in srgb, var(--border) 60%, transparent)',
        }}
      >
        {isWine
          ? <Wine size={24} style={{ color: accentColor }} />
          : <Utensils size={24} style={{ color: accentColor }} />
        }
      </div>
      <div className="flex flex-col items-center gap-[4px]">
        <p className="text-[15px] font-semibold" style={{ color: 'var(--text-sub)' }}>
          아직 통계가 없어요
        </p>
        <p className="text-[13px]" style={{ color: 'var(--text-hint)' }}>
          {isWine ? '와인을 기록하면 통계가 생겨요' : '맛집을 기록하면 통계가 생겨요'}
        </p>
      </div>
    </div>
  )
}

/* ── Main Panel ── */

export function HomeStatsPanel({
  activeTab,
  restaurantStats,
  wineStats,
  totalCountries,
}: HomeStatsPanelProps) {
  const isRestaurant = activeTab === 'restaurant'
  const stats = isRestaurant ? restaurantStats : wineStats
  const accentColor = isRestaurant ? 'var(--accent-food)' : 'var(--accent-wine)'

  if (stats.isLoading) return <StatsSkeleton />
  if (stats.totalRecordCount === 0) return <StatsEmpty type={activeTab} />

  const avgScore = computeAvgScore(stats.scoreBuckets)

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-24 md:px-8">
      {/* ── 요약 카드 ── */}
      {isRestaurant ? (
        <SummaryCard
          accentColor={accentColor}
          items={[
            { label: '기록', value: String(restaurantStats.totalRecordCount), sub: '곳' },
            { label: '도시', value: String(restaurantStats.cityStats.length), sub: `${totalCountries}개국` },
            ...(avgScore !== null ? [{ label: '평균', value: String(avgScore), sub: '점' }] : []),
            ...(restaurantStats.totalSpending > 0 ? [{ label: '소비', value: formatWon(restaurantStats.totalSpending) }] : []),
          ]}
        />
      ) : (
        <SummaryCard
          accentColor={accentColor}
          items={[
            { label: '기록', value: String(wineStats.totalRecordCount), sub: '병' },
            { label: '국가', value: String(wineStats.countryStats.length), sub: '개국' },
            ...(avgScore !== null ? [{ label: '평균', value: String(avgScore), sub: '점' }] : []),
            ...(wineStats.totalSpending > 0 ? [{ label: '소비', value: formatWon(wineStats.totalSpending) }] : []),
          ]}
        />
      )}

      {/* ── 식당 통계 ── */}
      {isRestaurant && (
        <>
          <SectionCard icon={<MapPin size={15} />} title={`${totalCountries}개국 ${restaurantStats.cityStats.length}곳`} accentColor={accentColor}>
            <WorldMapChart
              cities={restaurantStats.cityStats}
              totalCountries={totalCountries}
              totalPlaces={restaurantStats.cityStats.length}
            />
          </SectionCard>

          {restaurantStats.genreStats.length > 0 && (
            <SectionCard icon={<Utensils size={15} />} title="장르" accentColor={accentColor}>
              <GenreChart genres={restaurantStats.genreStats} />
            </SectionCard>
          )}

          <SectionCard icon={<BarChart2 size={15} />} title="점수 분포" accentColor={accentColor}>
            <ScoreDistribution
              buckets={restaurantStats.scoreBuckets}
              accentColor={accentColor}
            />
          </SectionCard>

          <SectionCard icon={<CalendarDays size={15} />} title="월별 소비" accentColor={accentColor}>
            <MonthlyChart
              months={restaurantStats.monthlyStats}
              totalAmount={restaurantStats.totalSpending}
              accentColor={accentColor}
              unit="곳"
            />
          </SectionCard>

          {restaurantStats.sceneStats.length > 0 && (
            <SectionCard icon={<Drama size={15} />} title="상황" accentColor={accentColor}>
              <SceneChart scenes={restaurantStats.sceneStats} />
            </SectionCard>
          )}
        </>
      )}

      {/* ── 와인 통계 ── */}
      {!isRestaurant && (
        <>
          <PdLockOverlay minRecords={5} currentCount={wineStats.totalRecordCount} accentColor={accentColor}>
            <WineRegionMap data={wineStats.countryStats} />
          </PdLockOverlay>

          <PdLockOverlay minRecords={10} currentCount={wineStats.totalRecordCount} accentColor={accentColor}>
            <div className="flex flex-col gap-4">
              <SectionCard icon={<Grape size={15} />} title="품종" accentColor={accentColor}>
                <VarietalChart varieties={wineStats.varietalStats} />
              </SectionCard>

              <SectionCard icon={<BarChart2 size={15} />} title="점수 분포" accentColor={accentColor}>
                <ScoreDistribution
                  buckets={wineStats.scoreBuckets}
                  accentColor={accentColor}
                />
              </SectionCard>
            </div>
          </PdLockOverlay>

          <PdLockOverlay minRecords={20} currentCount={wineStats.totalRecordCount} accentColor={accentColor}>
            <div className="flex flex-col gap-4">
              <SectionCard icon={<CalendarDays size={15} />} title="월별 소비" accentColor={accentColor}>
                <MonthlyChart
                  months={wineStats.monthlyStats}
                  totalAmount={wineStats.totalSpending}
                  accentColor={accentColor}
                  unit="병"
                />
              </SectionCard>

              <SectionCard icon={<Wine size={15} />} title="와인 타입" accentColor={accentColor}>
                <WineTypeChart types={wineStats.wineTypeStats} />
              </SectionCard>
            </div>
          </PdLockOverlay>
        </>
      )}
    </div>
  )
}
