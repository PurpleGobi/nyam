'use client'

import { useState, useEffect } from 'react'

interface UserCoords {
  lat: number
  lng: number
}

/**
 * 브라우저 Geolocation API로 사용자 현재 좌표를 가져오는 훅.
 * enabled=true일 때만 위치 요청을 보낸다 (거리순 소팅 시).
 * 1분간 캐시, 5초 타임아웃.
 */
export function useUserCoords(enabled: boolean): UserCoords | null {
  const [coords, setCoords] = useState<UserCoords | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* 위치 권한 거부 시 null 유지 */ },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    )
  }, [enabled])

  return coords
}
