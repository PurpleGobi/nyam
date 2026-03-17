"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"

export interface MapRecord {
  id: string
  title: string
  locationLat: number
  locationLng: number
  thumbnailUrl: string | null
}

/**
 * Fetches records that have location data for map display.
 */
export function useRecordsForMap(userId: string | null) {
  const supabase = createClient()

  const { data, error, isLoading } = useSWR<MapRecord[]>(
    userId ? `records-map/${userId}` : null,
    async () => {
      if (!userId) return []

      const { data: records } = await supabase
        .from("records")
        .select("id, menu_name, location_lat, location_lng, record_photos(thumbnail_url, order_index)")
        .eq("user_id", userId)
        .not("location_lat", "is", null)
        .not("location_lng", "is", null)
        .order("created_at", { ascending: false })

      return (records ?? []).map((item) => {
        const photos = (item.record_photos as Array<Record<string, unknown>>) ?? []
        const sortedPhotos = photos.sort(
          (a, b) => (a.order_index as number) - (b.order_index as number),
        )
        const firstPhoto = sortedPhotos[0] ?? null

        return {
          id: item.id as string,
          title: (item.menu_name as string) ?? "Untitled",
          locationLat: item.location_lat as number,
          locationLng: item.location_lng as number,
          thumbnailUrl: firstPhoto ? (firstPhoto.thumbnail_url as string | null) : null,
        }
      })
    },
  )

  return {
    records: data ?? [],
    isLoading,
    error: error ? String(error) : null,
  }
}
