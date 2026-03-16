'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Script from 'next/script'
import { cn } from '@/shared/utils/cn'

type Filter = 'all' | 'mine' | 'friends'

// Kakao Maps SDK does not provide TypeScript definitions.
// We use `any` exclusively for kakao.maps objects where no @types package exists.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void
        LatLng: new (lat: number, lng: number) => any
        Map: new (container: HTMLElement, options: { center: any; level: number }) => any
        ZoomControl: new () => any
        CustomOverlay: new (options: {
          position: any
          content: string
          yAnchor?: number
          zIndex?: number
        }) => any
        ControlPosition: { RIGHT: any }
        event: {
          addListener: (target: any, type: string, handler: () => void) => void
        }
      }
    }
  }
}

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }

export function HomeMapSection({
  myLocation,
  myPins,
  friendPins,
  filter,
  onFilterChange,
}: {
  myLocation: { lat: number; lng: number } | null
  myPins: {
    id: string
    lat: number
    lng: number
    rating: number
    name: string
  }[]
  friendPins: {
    id: string
    lat: number
    lng: number
    rating: number
    name: string
    friendName: string
    color: string
  }[]
  filter: Filter
  onFilterChange: (f: Filter) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [sdkError, setSdkError] = useState(false)
  const mapInstanceRef = useRef<any>(null) // kakao.maps.Map instance
  const overlaysRef = useRef<any[]>([]) // kakao.maps.CustomOverlay instances

  const filterOptions: { key: Filter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'mine', label: '내 기록' },
    { key: 'friends', label: '친구' },
  ]

  const clearOverlays = useCallback(() => {
    overlaysRef.current.forEach((overlay) => overlay.setMap(null))
    overlaysRef.current = []
  }, [])

  // Initialize map when SDK is ready
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    const { kakao } = window
    const center = myLocation
      ? new kakao.maps.LatLng(myLocation.lat, myLocation.lng)
      : new kakao.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng)

    const map = new kakao.maps.Map(mapRef.current, {
      center,
      level: 5,
    })

    map.addControl(
      new kakao.maps.ZoomControl(),
      kakao.maps.ControlPosition.RIGHT,
    )

    mapInstanceRef.current = map

    return () => {
      clearOverlays()
      mapInstanceRef.current = null
    }
  }, [mapLoaded, myLocation, clearOverlays])

  // Update markers when filter/pins change
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return

    const { kakao } = window
    const map = mapInstanceRef.current

    clearOverlays()

    // My location: pulsing blue dot
    if (myLocation) {
      const locationOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(myLocation.lat, myLocation.lng),
        content: `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(59,125,216,0.3);animation:kakao-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="width:12px;height:12px;border-radius:50%;background:#3B7DD8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>
        </div>
        <style>@keyframes kakao-ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2.5);opacity:0}}</style>`,
        yAnchor: 0.5,
        zIndex: 10,
      })
      locationOverlay.setMap(map)
      overlaysRef.current.push(locationOverlay)
    }

    // My pins (coral/orange)
    const visibleMyPins = filter === 'friends' ? [] : myPins
    visibleMyPins.forEach((pin) => {
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(pin.lat, pin.lng),
        content: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-4px);">
          <div style="background:#FF6038;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${pin.rating.toFixed(1)}</div>
          <div style="margin-top:2px;font-size:8px;font-weight:500;color:#374151;white-space:nowrap;text-shadow:0 0 3px rgba(255,255,255,0.9);">${pin.name}</div>
        </div>`,
        yAnchor: 1.2,
        zIndex: 5,
      })
      overlay.setMap(map)
      overlaysRef.current.push(overlay)
    })

    // Friend pins
    const visibleFriendPins = filter === 'mine' ? [] : friendPins
    visibleFriendPins.forEach((pin) => {
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(pin.lat, pin.lng),
        content: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-4px);">
          <div style="background:${pin.color};color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${pin.rating.toFixed(1)}</div>
          <div style="margin-top:2px;font-size:7px;font-weight:500;color:#374151;white-space:nowrap;text-shadow:0 0 3px rgba(255,255,255,0.9);">${pin.name}</div>
        </div>`,
        yAnchor: 1.2,
        zIndex: 3,
      })
      overlay.setMap(map)
      overlaysRef.current.push(overlay)
    })
  }, [mapLoaded, filter, myPins, friendPins, myLocation, clearOverlays])

  // If no JS key configured, show static fallback
  if (!KAKAO_JS_KEY) {
    return <StaticFallback filter={filter} onFilterChange={onFilterChange} filterOptions={filterOptions} />
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)]">
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => {
          window.kakao.maps.load(() => setMapLoaded(true))
        }}
        onError={() => setSdkError(true)}
      />

      {/* Map container */}
      <div className="relative h-48 w-full bg-[#f0ede7]">
        {sdkError ? (
          <div className="flex h-full items-center justify-center text-xs text-[var(--color-neutral-400)]">
            지도를 불러올 수 없습니다
          </div>
        ) : !mapLoaded ? (
          <div className="flex h-full items-center justify-center text-xs text-[var(--color-neutral-400)]">
            지도를 불러오는 중...
          </div>
        ) : null}
        <div
          ref={mapRef}
          className={cn('h-full w-full', !mapLoaded && 'invisible')}
        />
      </div>

      {/* Legend bar + filter toggles */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3 text-[10px] text-[var(--color-neutral-500)]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-primary-500)]" />
            내 기록
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#3B7DD8]" />
            현재 위치
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-neutral-400)]" />
            친구
          </span>
        </div>
        <div className="flex gap-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onFilterChange(opt.key)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                filter === opt.key
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Fallback when Kakao JS key is not configured */
function StaticFallback({
  filter,
  onFilterChange,
  filterOptions,
}: {
  filter: Filter
  onFilterChange: (f: Filter) => void
  filterOptions: { key: Filter; label: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)]">
      <div
        className="flex h-48 w-full items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #EDEAE4 0%, #E3DFD8 100%)',
        }}
      >
        <span className="text-xs text-[var(--color-neutral-400)]">
          지도를 불러오는 중...
        </span>
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3 text-[10px] text-[var(--color-neutral-500)]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-primary-500)]" />
            내 기록
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#3B7DD8]" />
            현재 위치
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-neutral-400)]" />
            친구
          </span>
        </div>
        <div className="flex gap-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onFilterChange(opt.key)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                filter === opt.key
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
