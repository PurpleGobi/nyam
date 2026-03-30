'use client'

import { useState, useEffect, useCallback } from 'react'

interface ResolvedLocation {
  country: string
  city: string
  district: string | null
  area: string | null
}

interface UseCurrentLocationReturn {
  location: ResolvedLocation | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

/**
 * 브라우저 위치 → district/area 변환 hook
 * 마운트 시 자동 실행, refresh()로 재실행 가능
 */
export function useCurrentLocation(): UseCurrentLocationReturn {
  const [location, setLocation] = useState<ResolvedLocation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolve = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('위치 서비스를 지원하지 않습니다'))
          return
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(new Error(err.code === 1 ? '위치 권한이 필요합니다' : '위치를 가져올 수 없습니다')),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
        )
      })

      const res = await fetch(`/api/location/resolve?lat=${coords.latitude}&lng=${coords.longitude}`)
      if (!res.ok) throw new Error('위치 변환 실패')

      const data: ResolvedLocation = await res.json()
      setLocation(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '위치 확인 실패')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    resolve()
  }, [resolve])

  return { location, isLoading, error, refresh: resolve }
}
