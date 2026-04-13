'use client'

import type {
  RestaurantStats, WineStats, BarChartItem, ScoreDistribution,
  MonthlySpending, MapMarker, SceneVisit, WineRegionMapData, WineTypeDistribution,
} from '@/domain/entities/profile'
import { StickyTabs } from '@/presentation/components/ui/sticky-tabs'
import { StatSummaryCards } from '@/presentation/components/profile/stat-summary-cards'
import { HorizontalBarChart } from '@/presentation/components/charts/horizontal-bar-chart'
import { VerticalBarChart } from '@/presentation/components/charts/vertical-bar-chart'
import { RestaurantMap } from '@/presentation/components/profile/restaurant-map'
import { WineRegionMapSimple } from '@/presentation/components/profile/wine-region-map-simple'
import { VarietyToggle } from '@/presentation/components/profile/variety-toggle'

type TabType = 'restaurant' | 'wine'

const TABS: { key: TabType; label: string; variant: 'food' | 'wine' }[] = [
  { key: 'restaurant', label: '식당', variant: 'food' },
  { key: 'wine', label: '와인', variant: 'wine' },
]

interface StatTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  // Restaurant data
  restaurantStats: RestaurantStats | null
  restaurantGenres: BarChartItem[]
  restaurantScoreDist: ScoreDistribution[]
  restaurantMonthlySpending: MonthlySpending[]
  restaurantMapMarkers: MapMarker[]
  restaurantScenes: SceneVisit[]
  // Wine data
  wineStats: WineStats | null
  wineVarieties: BarChartItem[]
  wineScoreDist: ScoreDistribution[]
  wineMonthlySpending: MonthlySpending[]
  wineRegionMap: WineRegionMapData[]
  wineTypeDistribution: WineTypeDistribution[]
  // Variety toggle
  showAllVarieties: boolean
  onToggleVarieties: (showAll: boolean) => void
  // Level section slot (경험치 & 레벨)
  levelSlot?: React.ReactNode
}

export function StatTabs({
  activeTab, onTabChange,
  restaurantStats, restaurantGenres, restaurantScoreDist,
  restaurantMonthlySpending, restaurantMapMarkers, restaurantScenes,
  wineStats, wineVarieties, wineScoreDist,
  wineMonthlySpending, wineRegionMap, wineTypeDistribution,
  showAllVarieties, onToggleVarieties,
  levelSlot,
}: StatTabsProps) {
  return (
    <div className="mt-6">
      <StickyTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* Stats content */}
      <div className="mx-4 mt-3">
        {activeTab === 'restaurant' && restaurantStats && (
          <RestaurantPanel
            stats={restaurantStats}
            genres={restaurantGenres}
            scoreDist={restaurantScoreDist}
            monthlySpending={restaurantMonthlySpending}
            mapMarkers={restaurantMapMarkers}
            scenes={restaurantScenes}
            levelSlot={levelSlot}
          />
        )}

        {activeTab === 'wine' && wineStats && (
          <WinePanel
            stats={wineStats}
            varieties={wineVarieties}
            scoreDist={wineScoreDist}
            monthlySpending={wineMonthlySpending}
            regionMap={wineRegionMap}
            typeDistribution={wineTypeDistribution}
            showAllVarieties={showAllVarieties}
            onToggleVarieties={onToggleVarieties}
            levelSlot={levelSlot}
          />
        )}

        {activeTab === 'restaurant' && !restaurantStats && <EmptyStats label="식당" />}
        {activeTab === 'wine' && !wineStats && <EmptyStats label="와인" />}
      </div>
    </div>
  )
}

function RestaurantPanel({
  stats, genres, scoreDist, monthlySpending, mapMarkers, scenes, levelSlot,
}: {
  stats: RestaurantStats
  genres: BarChartItem[]
  scoreDist: ScoreDistribution[]
  monthlySpending: MonthlySpending[]
  mapMarkers: MapMarker[]
  scenes: SceneVisit[]
  levelSlot?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <StatSummaryCards
        cards={[
          { label: '총 방문', value: stats.totalVisits, trend: stats.thisMonthVisits ? `+${stats.thisMonthVisits} 이번 달` : undefined, color: 'var(--accent-food)' },
          { label: '평균 점수', value: stats.avgScore, trend: stats.scoreDelta ? (stats.scoreDelta > 0 ? `+${stats.scoreDelta}` : `${stats.scoreDelta}`) : '-', color: 'var(--accent-food)' },
          { label: '방문 지역', value: stats.visitedAreas, trend: stats.thisMonthNewAreas ? `+${stats.thisMonthNewAreas} 신규` : undefined, color: 'var(--accent-food)' },
        ]}
      />

      {/* 경험치 & 레벨 */}
      {levelSlot}

      {/* 식당 지도 */}
      <RestaurantMap markers={mapMarkers} />

      {/* 장르 분포 */}
      {genres.length > 0 && (
        <HorizontalBarChart title="장르 분포" items={genres} colorBase="var(--accent-food)" />
      )}

      {/* 점수 분포 */}
      {scoreDist.length > 0 && (
        <VerticalBarChart
          title="점수 분포"
          items={scoreDist.map((d) => ({ label: d.range, value: d.count }))}
          colorBase="var(--accent-food)"
        />
      )}

      {/* 월별 소비 */}
      {monthlySpending.length > 0 && (
        <VerticalBarChart
          title="월별 소비"
          items={monthlySpending.map((m) => ({
            label: m.label,
            value: m.amount,
            highlight: m.amount === Math.max(...monthlySpending.map((s) => s.amount)),
          }))}
          colorBase="var(--accent-food)"
          valueLabel="만"
          totalLabel={`총 ${monthlySpending.reduce((sum, m) => sum + m.amount, 0)}만`}
        />
      )}

      {/* 상황별 방문 */}
      {scenes.length > 0 && (
        <HorizontalBarChart
          title="상황별 방문"
          items={scenes.map((s) => ({ label: s.label, value: s.count, color: s.color }))}
          colorBase="var(--accent-food)"
        />
      )}
    </div>
  )
}

function WinePanel({
  stats, varieties, scoreDist, monthlySpending, regionMap, typeDistribution,
  showAllVarieties, onToggleVarieties, levelSlot,
}: {
  stats: WineStats
  varieties: BarChartItem[]
  scoreDist: ScoreDistribution[]
  monthlySpending: MonthlySpending[]
  regionMap: WineRegionMapData[]
  typeDistribution: WineTypeDistribution[]
  showAllVarieties: boolean
  onToggleVarieties: (showAll: boolean) => void
  levelSlot?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <StatSummaryCards
        cards={[
          { label: '총 시음', value: stats.totalTastings, color: 'var(--accent-wine)' },
          { label: '평균 점수', value: stats.avgScore, color: 'var(--accent-wine)' },
        ]}
      />

      {/* 경험치 & 레벨 */}
      {levelSlot}

      {/* 와인 산지 지도 */}
      <WineRegionMapSimple data={regionMap} />

      {/* 품종 분포 */}
      {varieties.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-end">
            <VarietyToggle showAll={showAllVarieties} onChange={onToggleVarieties} />
          </div>
          <HorizontalBarChart title="품종 분포" items={varieties} colorBase="var(--accent-wine)" />
        </div>
      )}

      {/* 점수 분포 */}
      {scoreDist.length > 0 && (
        <VerticalBarChart
          title="점수 분포"
          items={scoreDist.map((d) => ({ label: d.range, value: d.count }))}
          colorBase="var(--accent-wine)"
        />
      )}

      {/* 월별 소비 */}
      {monthlySpending.length > 0 && (
        <VerticalBarChart
          title="월별 소비"
          items={monthlySpending.map((m) => ({
            label: m.label,
            value: m.count ?? m.amount,
            highlight: (m.count ?? m.amount) === Math.max(...monthlySpending.map((s) => s.count ?? s.amount)),
          }))}
          colorBase="var(--accent-wine)"
          valueLabel="병"
          totalLabel={`총 ${monthlySpending.reduce((sum, m) => sum + (m.count ?? m.amount), 0)}병`}
        />
      )}

      {/* 타입별 분포 */}
      {typeDistribution.length > 0 && (
        <HorizontalBarChart
          title="타입별 분포"
          items={typeDistribution.map((t) => ({ label: t.label, value: t.count, color: t.color }))}
          colorBase="var(--accent-wine)"
        />
      )}
    </div>
  )
}

function EmptyStats({ label }: { label: string }) {
  return (
    <div className="empty-state card rounded-2xl py-10">
      <p className="empty-state-title">{label} 기록이 없습니다</p>
      <p className="empty-state-desc">첫 기록을 남겨보세요</p>
    </div>
  )
}
