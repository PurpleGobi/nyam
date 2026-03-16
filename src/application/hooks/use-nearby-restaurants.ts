'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import type { KakaoPlaceResult } from '@/infrastructure/api/kakao-local'

interface NearbyResponse {
  places: KakaoPlaceResult[]
}

export function useNearbyRestaurants(radius = 500) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        // Permission denied or error — keep location null
      },
    )
  }, [])

  const { data, isLoading, error, mutate } = useSWR<NearbyResponse>(
    location
      ? [`/api/restaurants/nearby`, location.lat, location.lng, radius]
      : null,
    async () => {
      if (!location) return { places: [] }

      const params = new URLSearchParams({
        lat: String(location.lat),
        lng: String(location.lng),
        radius: String(radius),
      })

      const res = await fetch(`/api/restaurants/nearby?${params}`)
      if (!res.ok) return { places: [] }

      return res.json()
    },
    {
      refreshInterval: 0,
      dedupingInterval: 300000,
    },
  )

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    nearbyPlaces: data?.places ?? [],
    location,
    isLoading,
    error,
    refresh,
  }
}
