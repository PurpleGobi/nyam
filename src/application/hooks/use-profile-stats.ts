'use client'

import useSWR from 'swr'
import { profileRepo } from '@/shared/di/container'
import { useAuth } from '@/presentation/providers/auth-provider'

/** 식당 세부 통계 (탭 전환 시 lazy load) */
export function useRestaurantStats() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data: stats } = useSWR(userId ? ['restaurant-stats', userId] : null, ([, id]) => profileRepo.getRestaurantStats(id))
  const { data: genres } = useSWR(userId ? ['genre-dist', userId] : null, ([, id]) => profileRepo.getGenreDistribution(id))
  const { data: scoreDist } = useSWR(userId ? ['rest-score-dist', userId] : null, ([, id]) => profileRepo.getRestaurantScoreDistribution(id))
  const { data: monthlySpending } = useSWR(userId ? ['rest-monthly', userId] : null, ([, id]) => profileRepo.getRestaurantMonthlySpending(id, 6))
  const { data: mapMarkers } = useSWR(userId ? ['rest-map', userId] : null, ([, id]) => profileRepo.getRestaurantMapMarkers(id))
  const { data: scenes } = useSWR(userId ? ['scene-dist', userId] : null, ([, id]) => profileRepo.getSceneDistribution(id))

  return { stats, genres, scoreDist, monthlySpending, mapMarkers, scenes }
}

/** 와인 세부 통계 (탭 전환 시 lazy load) */
export function useWineStats() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data: stats } = useSWR(userId ? ['wine-stats', userId] : null, ([, id]) => profileRepo.getWineStats(id))
  const { data: varieties } = useSWR(userId ? ['variety-dist', userId] : null, ([, id]) => profileRepo.getVarietyDistribution(id))
  const { data: scoreDist } = useSWR(userId ? ['wine-score-dist', userId] : null, ([, id]) => profileRepo.getWineScoreDistribution(id))
  const { data: monthlySpending } = useSWR(userId ? ['wine-monthly', userId] : null, ([, id]) => profileRepo.getWineMonthlySpending(id, 6))
  const { data: regionMap } = useSWR(userId ? ['wine-region-map', userId] : null, ([, id]) => profileRepo.getWineRegionMapData(id))
  const { data: typeDistribution } = useSWR(userId ? ['wine-type-dist', userId] : null, ([, id]) => profileRepo.getWineTypeDistribution(id))

  return { stats, varieties, scoreDist, monthlySpending, regionMap, typeDistribution }
}
