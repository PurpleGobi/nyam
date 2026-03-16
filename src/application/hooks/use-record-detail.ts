'use client'

import useSWR from 'swr'
import { getRecordRepository, getRestaurantRepository } from '@/di/repositories'

export function useRecordDetail(id: string | undefined) {
  const recordRepo = getRecordRepository()
  const restaurantRepo = getRestaurantRepository()

  const record = useSWR(
    id ? ['record', id] : null,
    () => recordRepo.getById(id!),
  )

  const restaurantId = record.data?.restaurantId
  const restaurant = useSWR(
    restaurantId ? ['restaurant', restaurantId] : null,
    () => restaurantRepo.getById(restaurantId!),
  )

  return {
    record: record.data,
    restaurant: restaurant.data,
    isLoading: record.isLoading || restaurant.isLoading,
    error: record.error || restaurant.error,
  }
}
