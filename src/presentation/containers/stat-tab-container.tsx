'use client'

import { useState } from 'react'
import { useRestaurantStats, useWineStats } from '@/application/hooks/use-profile-stats'
import { StatTabs } from '@/presentation/components/profile/stat-tabs'

interface StatTabContainerProps {
  levelSlot?: React.ReactNode
  onTabChange?: (tab: 'restaurant' | 'wine') => void
}

export function StatTabContainer({ levelSlot, onTabChange: onTabChangeExternal }: StatTabContainerProps) {
  const [activeTab, setActiveTab] = useState<'restaurant' | 'wine'>('restaurant')
  const [showAllVarieties, setShowAllVarieties] = useState(false)

  const restaurantData = useRestaurantStats()
  const wineData = useWineStats()

  const handleTabChange = (tab: 'restaurant' | 'wine') => {
    setActiveTab(tab)
    onTabChangeExternal?.(tab)
  }

  return (
    <StatTabs
      activeTab={activeTab}
      onTabChange={handleTabChange}
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
      levelSlot={levelSlot}
    />
  )
}
