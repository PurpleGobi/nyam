'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Script from 'next/script'
import { cn } from '@/shared/utils/cn'

type Filter = 'all' | 'mine' | 'friends'
type MapProvider = 'naver' | 'kakao'

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
        event: { addListener: (target: any, type: string, handler: () => void) => void }
      }
    }
    naver: {
      maps: {
        Map: new (container: HTMLElement, options: any) => any
        LatLng: new (lat: number, lng: number) => any
        Marker: new (options: any) => any
        InfoWindow: new (options: any) => any
        Event: { addListener: (target: any, type: string, handler: () => void) => void }
        Position: { RIGHT_CENTER: any }
        ZoomControl: new () => any
      }
    }
  }
}

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }

interface Pin {
  id: string
  lat: number
  lng: number
  rating: number
  name: string
}

interface FriendPin extends Pin {
  friendName: string
  color: string
}

export function HomeMapSection({
  myLocation,
  myPins,
  friendPins,
  filter,
  onFilterChange,
}: {
  myLocation: { lat: number; lng: number } | null
  myPins: Pin[]
  friendPins: FriendPin[]
  filter: Filter
  onFilterChange: (f: Filter) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [provider, setProvider] = useState<MapProvider>('naver')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [sdkError, setSdkError] = useState(false)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const filterOptions: { key: Filter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'mine', label: '내 기록' },
    { key: 'friends', label: '친구' },
  ]

  // Reset when provider changes
  useEffect(() => {
    markersRef.current.forEach(m => {
      if (m.setMap) m.setMap(null)
    })
    markersRef.current = []
    mapInstanceRef.current = null
    setMapLoaded(false)
    setSdkError(false)
  }, [provider])

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => {
      if (m.setMap) m.setMap(null)
    })
    markersRef.current = []
  }, [])

  // ─── Naver Maps ───
  const initNaverMap = useCallback(() => {
    if (!mapRef.current || !window.naver?.maps) return
    const center = myLocation
      ? new window.naver.maps.LatLng(myLocation.lat, myLocation.lng)
      : new window.naver.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng)

    mapInstanceRef.current = new window.naver.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: true,
      zoomControlOptions: { position: window.naver.maps.Position?.RIGHT_CENTER },
    })
    setMapLoaded(true)
  }, [myLocation])

  const addNaverMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.naver?.maps) return
    clearMarkers()
    const map = mapInstanceRef.current

    const visibleMyPins = filter === 'friends' ? [] : myPins
    visibleMyPins.forEach(pin => {
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(pin.lat, pin.lng),
        map,
        icon: {
          content: `<div style="display:flex;flex-direction:column;align-items:center;">
            <div style="background:#FF6038;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${Math.round(pin.rating)}</div>
            <div style="margin-top:2px;font-size:8px;font-weight:500;color:#374151;white-space:nowrap;text-shadow:0 0 3px rgba(255,255,255,0.9);">${pin.name}</div>
          </div>`,
          anchor: { x: 14, y: 38 },
        },
      })
      markersRef.current.push(marker)
    })

    const visibleFriendPins = filter === 'mine' ? [] : friendPins
    visibleFriendPins.forEach(pin => {
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(pin.lat, pin.lng),
        map,
        icon: {
          content: `<div style="display:flex;flex-direction:column;align-items:center;">
            <div style="background:${pin.color};color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${Math.round(pin.rating)}</div>
            <div style="margin-top:2px;font-size:7px;font-weight:500;color:#374151;white-space:nowrap;text-shadow:0 0 3px rgba(255,255,255,0.9);">${pin.name}</div>
          </div>`,
          anchor: { x: 12, y: 34 },
        },
      })
      markersRef.current.push(marker)
    })
  }, [filter, myPins, friendPins, clearMarkers])

  // ─── Kakao Maps ───
  const initKakaoMap = useCallback(() => {
    if (!mapRef.current || !window.kakao?.maps) return
    const { kakao } = window
    const center = myLocation
      ? new kakao.maps.LatLng(myLocation.lat, myLocation.lng)
      : new kakao.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng)

    const map = new kakao.maps.Map(mapRef.current, { center, level: 5 })
    map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT)
    mapInstanceRef.current = map
    setMapLoaded(true)
  }, [myLocation])

  const addKakaoMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return
    clearMarkers()
    const { kakao } = window
    const map = mapInstanceRef.current

    if (myLocation) {
      const loc = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(myLocation.lat, myLocation.lng),
        content: `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(59,125,216,0.3);animation:map-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="width:12px;height:12px;border-radius:50%;background:#3B7DD8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>
        </div><style>@keyframes map-ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2.5);opacity:0}}</style>`,
        yAnchor: 0.5, zIndex: 10,
      })
      loc.setMap(map)
      markersRef.current.push(loc)
    }

    const visibleMyPins = filter === 'friends' ? [] : myPins
    visibleMyPins.forEach(pin => {
      const o = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(pin.lat, pin.lng),
        content: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-4px);">
          <div style="background:#FF6038;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${Math.round(pin.rating)}</div>
          <div style="margin-top:2px;font-size:8px;font-weight:500;color:#374151;white-space:nowrap;text-shadow:0 0 3px rgba(255,255,255,0.9);">${pin.name}</div>
        </div>`,
        yAnchor: 1.2, zIndex: 5,
      })
      o.setMap(map)
      markersRef.current.push(o)
    })

    const visibleFriendPins = filter === 'mine' ? [] : friendPins
    visibleFriendPins.forEach(pin => {
      const o = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(pin.lat, pin.lng),
        content: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-4px);">
          <div style="background:${pin.color};color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${Math.round(pin.rating)}</div>
          <div style="margin-top:2px;font-size:7px;font-weight:500;color:#374151;white-space:nowrap;text-shadow:0 0 3px rgba(255,255,255,0.9);">${pin.name}</div>
        </div>`,
        yAnchor: 1.2, zIndex: 3,
      })
      o.setMap(map)
      markersRef.current.push(o)
    })
  }, [filter, myPins, friendPins, myLocation, clearMarkers])

  // Re-add markers when filter/pins change
  useEffect(() => {
    if (!mapLoaded) return
    if (provider === 'naver') addNaverMarkers()
    else addKakaoMarkers()
  }, [mapLoaded, provider, filter, myPins, friendPins, addNaverMarkers, addKakaoMarkers])

  const hasSdk = provider === 'naver' ? !!NAVER_CLIENT_ID : !!KAKAO_JS_KEY

  if (!hasSdk) {
    return <StaticFallback provider={provider} setProvider={setProvider} filter={filter} onFilterChange={onFilterChange} filterOptions={filterOptions} />
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)]">
      {/* SDK Script */}
      {provider === 'naver' ? (
        <Script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_CLIENT_ID}`}
          strategy="afterInteractive"
          onLoad={initNaverMap}
          onError={() => setSdkError(true)}
        />
      ) : (
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`}
          strategy="afterInteractive"
          onLoad={() => {
            if (window.kakao?.maps) {
              window.kakao.maps.load(initKakaoMap)
            } else {
              setSdkError(true)
            }
          }}
          onError={() => setSdkError(true)}
        />
      )}

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
        <div ref={mapRef} className={cn('h-full w-full', !mapLoaded && 'invisible')} />

        {/* Provider toggle */}
        <div className="absolute top-2 left-2 z-10 flex rounded-lg bg-white/90 shadow-sm backdrop-blur-sm overflow-hidden text-[10px]">
          <button
            type="button"
            onClick={() => setProvider('naver')}
            className={cn(
              'px-2 py-1 font-medium transition-colors',
              provider === 'naver' ? 'bg-[#03C75A] text-white' : 'text-neutral-500',
            )}
          >
            네이버
          </button>
          <button
            type="button"
            onClick={() => setProvider('kakao')}
            className={cn(
              'px-2 py-1 font-medium transition-colors',
              provider === 'kakao' ? 'bg-[#FEE500] text-[#191919]' : 'text-neutral-500',
            )}
          >
            카카오
          </button>
        </div>
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

function StaticFallback({
  provider,
  setProvider,
  filter,
  onFilterChange,
  filterOptions,
}: {
  provider: MapProvider
  setProvider: (p: MapProvider) => void
  filter: Filter
  onFilterChange: (f: Filter) => void
  filterOptions: { key: Filter; label: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)]">
      <div className="relative flex h-48 w-full items-center justify-center" style={{ background: 'linear-gradient(135deg, #EDEAE4 0%, #E3DFD8 100%)' }}>
        <span className="text-xs text-[var(--color-neutral-400)]">지도 API 키가 설정되지 않았습니다</span>
        <div className="absolute top-2 left-2 flex rounded-lg bg-white/90 shadow-sm overflow-hidden text-[10px]">
          <button type="button" onClick={() => setProvider('naver')} className={cn('px-2 py-1 font-medium', provider === 'naver' ? 'bg-[#03C75A] text-white' : 'text-neutral-500')}>네이버</button>
          <button type="button" onClick={() => setProvider('kakao')} className={cn('px-2 py-1 font-medium', provider === 'kakao' ? 'bg-[#FEE500] text-[#191919]' : 'text-neutral-500')}>카카오</button>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3 text-[10px] text-[var(--color-neutral-500)]">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[var(--color-primary-500)]" />내 기록</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#3B7DD8]" />현재 위치</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[var(--color-neutral-400)]" />친구</span>
        </div>
        <div className="flex gap-1">
          {filterOptions.map(opt => (
            <button key={opt.key} type="button" onClick={() => onFilterChange(opt.key)} className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors', filter === opt.key ? 'bg-[var(--color-primary-500)] text-white' : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]')}>{opt.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
