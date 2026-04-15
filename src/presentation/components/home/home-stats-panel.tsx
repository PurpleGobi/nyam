'use client'

import dynamic from 'next/dynamic'
import { PdLockOverlay } from '@/presentation/components/home/pd-lock-overlay'
import type { RestaurantStatsResult } from '@/application/hooks/use-restaurant-stats'
import type { WineStatsResult } from '@/application/hooks/use-wine-stats'

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

export function HomeStatsPanel({
  activeTab,
  restaurantStats,
  wineStats,
  totalCountries,
}: HomeStatsPanelProps) {
  return (
    <div className="px-4 pt-2 md:px-8">
      <div className="flex flex-col gap-5">
        {activeTab === 'restaurant' && (
          <>
            <WorldMapChart
              cities={restaurantStats.cityStats}
              totalCountries={totalCountries}
              totalPlaces={restaurantStats.cityStats.length}
            />

            {restaurantStats.genreStats.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>장르</p>
                <GenreChart genres={restaurantStats.genreStats} />
              </div>
            )}

            <div>
              <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>점수 분포</p>
              <ScoreDistribution
                buckets={restaurantStats.scoreBuckets}
                accentColor="var(--accent-food)"
              />
            </div>

            <MonthlyChart
              months={restaurantStats.monthlyStats}
              totalAmount={restaurantStats.totalSpending}
              accentColor="var(--accent-food)"
              unit="곳"
            />

            {restaurantStats.sceneStats.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>상황</p>
                <SceneChart scenes={restaurantStats.sceneStats} />
              </div>
            )}
          </>
        )}

        {activeTab === 'wine' && (
          <>
            <PdLockOverlay minRecords={5} currentCount={wineStats.totalRecordCount}>
              <WineRegionMap data={wineStats.countryStats} />
            </PdLockOverlay>

            <PdLockOverlay minRecords={10} currentCount={wineStats.totalRecordCount}>
              <div className="flex flex-col gap-5">
                <div>
                  <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>품종</p>
                  <VarietalChart varieties={wineStats.varietalStats} />
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>점수 분포</p>
                  <ScoreDistribution
                    buckets={wineStats.scoreBuckets}
                    accentColor="var(--accent-wine)"
                  />
                </div>
              </div>
            </PdLockOverlay>

            <PdLockOverlay minRecords={20} currentCount={wineStats.totalRecordCount}>
              <div className="flex flex-col gap-5">
                <MonthlyChart
                  months={wineStats.monthlyStats}
                  totalAmount={wineStats.totalSpending}
                  accentColor="var(--accent-wine)"
                  unit="병"
                />
                <WineTypeChart types={wineStats.wineTypeStats} />
              </div>
            </PdLockOverlay>
          </>
        )}
      </div>
    </div>
  )
}
