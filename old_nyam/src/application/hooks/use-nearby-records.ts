'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'

interface NearbyRecord {
  id: string
  menuName: string
  category: string
  ratingOverall: number
  createdAt: string
  restaurantId: string | null
}

export function useNearbyRecords(location?: { lat: number; lng: number } | null) {
  const { data, isLoading, error } = useSWR(
    location ? ['nearby-records', location.lat, location.lng] : null,
    async () => {
      if (!location) return []

      const supabase = createClient()
      const delta = 0.02 // ~2km radius

      const { data, error } = await supabase
        .from('records')
        .select('id, menu_name, category, rating_overall, created_at, restaurant_id, location_lat, location_lng')
        .eq('visibility', 'public')
        .gte('location_lat', location.lat - delta)
        .lte('location_lat', location.lat + delta)
        .gte('location_lng', location.lng - delta)
        .lte('location_lng', location.lng + delta)
        .order('rating_overall', { ascending: false })
        .limit(10)

      if (error) throw error

      return (data ?? []).map((row): NearbyRecord => ({
        id: row.id,
        menuName: row.menu_name ?? '',
        category: row.category ?? '',
        ratingOverall: row.rating_overall ?? 0,
        createdAt: row.created_at,
        restaurantId: row.restaurant_id,
      }))
    },
  )

  return { data: data ?? [], isLoading, error }
}
