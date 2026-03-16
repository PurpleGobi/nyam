'use client'

import useSWR from 'swr'
import { getRestaurantRepository } from '@/di/repositories'
import { createClient } from '@/infrastructure/supabase/client'

interface CommunityRecord {
  id: string
  menuName: string
  ratingOverall: number
  createdAt: string
  comment: string | null
  userId: string
}

interface RawRecord {
  id: string
  menu_name: string
  category: string
  rating_overall: number
  created_at: string
  user_id: string
  comment: string | null
  visibility: string
}

async function fetchCommunityRecords(restaurantId: string): Promise<CommunityRecord[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('records')
    .select('id, menu_name, category, rating_overall, created_at, user_id, comment, visibility')
    .eq('restaurant_id', restaurantId)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(20)

  if (!data) return []

  return (data as RawRecord[]).map((r) => ({
    id: r.id,
    menuName: r.menu_name,
    ratingOverall: r.rating_overall,
    createdAt: r.created_at,
    comment: r.comment,
    userId: r.user_id,
  }))
}

export function useRestaurantDetail(id: string | undefined) {
  const repo = getRestaurantRepository()

  const restaurant = useSWR(
    id ? ['restaurant', id] : null,
    () => repo.getById(id!),
  )

  const records = useSWR(
    id ? ['restaurant-records', id] : null,
    () => fetchCommunityRecords(id!),
  )

  return {
    restaurant: restaurant.data,
    records: records.data ?? [],
    isLoading: restaurant.isLoading || records.isLoading,
  }
}
