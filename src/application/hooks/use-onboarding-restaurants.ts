'use client'

import { useState, useEffect, useCallback } from 'react'
import type { OnboardingSeedRestaurant, OnboardingArea } from '@/domain/entities/onboarding'
import { onboardingRepo } from '@/shared/di/container'

interface UseOnboardingRestaurantsResult {
  area: OnboardingArea
  setArea: (area: OnboardingArea) => void
  restaurants: OnboardingSeedRestaurant[]
  registeredIds: Set<string>
  isLoading: boolean
  searchQuery: string
  setSearchQuery: (query: string) => void
  register: (restaurantId: string) => Promise<void>
  unregister: (restaurantId: string) => Promise<void>
}

export function useOnboardingRestaurants(userId: string | null): UseOnboardingRestaurantsResult {
  const [area, setArea] = useState<OnboardingArea>('강남')
  const [restaurants, setRestaurants] = useState<OnboardingSeedRestaurant[]>([])
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetch = searchQuery.length >= 2
      ? onboardingRepo.searchSeedRestaurants(area, searchQuery)
      : onboardingRepo.getSeedRestaurants(area)

    fetch
      .then(setRestaurants)
      .finally(() => setIsLoading(false))
  }, [area, searchQuery])

  const register = useCallback(async (restaurantId: string) => {
    if (!userId) return
    await onboardingRepo.registerRestaurant(restaurantId, userId)
    setRegisteredIds((prev) => new Set([...prev, restaurantId]))
  }, [userId])

  const unregister = useCallback(async (restaurantId: string) => {
    if (!userId) return
    await onboardingRepo.unregisterRestaurant(restaurantId, userId)
    setRegisteredIds((prev) => {
      const next = new Set(prev)
      next.delete(restaurantId)
      return next
    })
  }, [userId])

  return {
    area,
    setArea,
    restaurants,
    registeredIds,
    isLoading,
    searchQuery,
    setSearchQuery,
    register,
    unregister,
  }
}
