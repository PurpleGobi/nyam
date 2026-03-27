'use client'

import { useState, useCallback } from 'react'
import type { RestaurantStats, WineStats } from '@/domain/entities/profile'
import { profileRepo } from '@/shared/di/container'

export function useProfileStats(userId: string | null) {
  const [restaurantStats, setRestaurantStats] = useState<RestaurantStats | null>(null)
  const [wineStats, setWineStats] = useState<WineStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadRestaurantStats = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const stats = await profileRepo.getRestaurantStats(userId)
      setRestaurantStats(stats)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const loadWineStats = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const stats = await profileRepo.getWineStats(userId)
      setWineStats(stats)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  return { restaurantStats, wineStats, isLoading, loadRestaurantStats, loadWineStats }
}
