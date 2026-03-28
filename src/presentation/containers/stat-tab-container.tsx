'use client'

import { useState } from 'react'
import { useRestaurantStats, useWineStats } from '@/application/hooks/use-profile-stats'
import { StatTabs } from '@/presentation/components/profile/stat-tabs'

export function StatTabContainer() {
  const [activeTab, setActiveTab] = useState<'restaurant' | 'wine'>('restaurant')
  const [showAllVarieties, setShowAllVarieties] = useState(false)

  const restaurantData = useRestaurantStats()
  const wineData = useWineStats()

  return (
    <StatTabs
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showAllVarieties={showAllVarieties}
      onToggleVarieties={setShowAllVarieties}
      restaurantStats={restaurantData.stats ?? null}
      restaurantGenres={restaurantData.genres ?? []}
      restaurantScoreDist={restaurantData.scoreDist ?? []}
      restaurantMonthlySpending={restaurantData.monthlySpending ?? []}
      restaurantMapMarkers={restaurantData.mapMarkers ?? []}
      restaurantScenes={restaurantData.scenes ?? []}
      wineStats={wineData.stats ?? null}
      wineVarieties={wineData.varieties ?? []}
      wineScoreDist={wineData.scoreDist ?? []}
      wineMonthlySpending={wineData.monthlySpending ?? []}
      wineRegionMap={wineData.regionMap ?? []}
      wineTypeDistribution={wineData.typeDistribution ?? []}
    />
  )
}
