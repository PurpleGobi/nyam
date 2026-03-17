"use client"

import useSWR from "swr"
import type { NearbyPlace } from "@/infrastructure/api/kakao-local"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useNearbyRestaurants(lat: number | null, lng: number | null) {
  const { data, error, isLoading } = useSWR<{ places: NearbyPlace[] }>(
    lat && lng ? `/api/restaurants/nearby?lat=${lat}&lng=${lng}` : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  return {
    places: data?.places ?? [],
    isLoading,
    error: error ? String(error) : null,
  }
}
