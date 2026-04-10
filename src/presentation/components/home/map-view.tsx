'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { MapPinned, LocateFixed } from 'lucide-react'
import type {
  MapDiscoveryItem,
} from '@/domain/entities/map-discovery'
import { MapCompactItem } from '@/presentation/components/home/map-compact-item'

interface MapViewProps {
  /** 현재 페이지 아이템 (지도 마커 + 리스트 동일) */
  items: MapDiscoveryItem[]
  /** 지도 idle 이벤트 (bounds 포함) */
  onMapIdle: (center: { lat: number; lng: number }, zoom: number, bounds: { north: number; south: number; east: number; west: number } | null) => void
  /** 아이템 클릭 (포커스) */
  onItemSelect: (item: MapDiscoveryItem) => void
  /** 아이템 재클릭 → 네비게이트 */
  onItemNavigate: (item: MapDiscoveryItem) => void
  /** nearby 로딩 중 */
  isNearbyLoading: boolean
  /** 사용자 위치 (초기 center 결정용) */
  userLat?: number | null
  userLng?: number | null
  /** 페이지네이션 */
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

/** Google Maps 스타일 — POI 숨기기 + 지도 톤 연하게 (도트 가시성 확보) */
const MAP_STYLES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', stylers: [{ saturation: -70 }, { lightness: 40 }] },
  { featureType: 'road', stylers: [{ saturation: -80 }, { lightness: 50 }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ lightness: 30 }] },
  { featureType: 'water', stylers: [{ saturation: -60 }, { lightness: 40 }] },
  { featureType: 'administrative', elementType: 'labels', stylers: [{ lightness: 30 }] },
]

/** Google Maps SDK 로드 (한 번만) */
let optionsSet = false
function loadGoogleMaps(): Promise<void> {
  if (!GOOGLE_MAPS_KEY) return Promise.reject(new Error('API key missing'))

  if (!optionsSet) {
    setOptions({ key: GOOGLE_MAPS_KEY, v: 'weekly', language: 'ko', region: 'KR' })
    optionsSet = true
  }
  return importLibrary('maps').then(() => undefined)
}

/* ─────────── 커스텀 오버레이 (OverlayView 기반, 지연 생성) ─────────── */

interface HtmlOverlayInstance {
  setMap(map: google.maps.Map | null): void
  setZIdx(z: number): void
}

/** SDK 로드 후에만 호출 — google.maps.OverlayView를 런타임에 확장 */
function createHtmlOverlay(opts: {
  position: google.maps.LatLng
  content: HTMLDivElement
  zIndex: number
  map: google.maps.Map
}): HtmlOverlayInstance {
  const overlay = new google.maps.OverlayView()
  const container = opts.content
  let zIdx = opts.zIndex
  const position = opts.position

  container.style.position = 'absolute'
  container.style.cursor = 'pointer'

  overlay.onAdd = () => {
    const panes = overlay.getPanes()
    if (panes) {
      panes.overlayMouseTarget.appendChild(container)
    }
  }

  overlay.draw = () => {
    const projection = overlay.getProjection()
    if (!projection) return
    const point = projection.fromLatLngToDivPixel(position)
    if (!point) return
    container.style.left = `${point.x}px`
    container.style.top = `${point.y}px`
    container.style.transform = 'translate(-50%, -100%)'
    container.style.zIndex = String(zIdx)
  }

  overlay.onRemove = () => {
    container.parentNode?.removeChild(container)
  }

  overlay.setMap(opts.map)

  return {
    setMap: (map: google.maps.Map | null) => overlay.setMap(map),
    setZIdx: (z: number) => {
      zIdx = z
      container.style.zIndex = String(z)
    },
  }
}

/* ─────────── 도트 마커 HTML ─────────── */

function createDotHtml(selected: boolean, name?: string): string {
  const size = selected ? 14 : 8
  const color = selected ? '#C62828' : '#E53935'
  const border = selected ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.8)'
  const shadow = selected
    ? '0 2px 8px rgba(0,0,0,0.4)'
    : '0 1px 4px rgba(0,0,0,0.3)'
  const nameTag = selected && name
    ? `<div style="
        position:absolute;top:100%;left:50%;transform:translateX(-50%);
        margin-top:3px;white-space:nowrap;
        padding:2px 8px;border-radius:4px;
        background:rgba(0,0,0,0.8);
        font-size:11px;font-weight:600;color:#fff;
        pointer-events:none;
      ">${name}</div>`
    : ''
  return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};
      border:${border};
      box-shadow:${shadow};
      transition:all 0.15s ease;
      cursor:pointer;
    "></div>
    ${nameTag}
  </div>`
}

// 서울 시청 기본 좌표
const DEFAULT_LAT = 37.5665
const DEFAULT_LNG = 126.978
const DEFAULT_ZOOM = 14
const MY_LOCATION_ZOOM = 16

export function MapView({
  items,
  onMapIdle,
  onItemSelect,
  onItemNavigate,
  isNearbyLoading,
  userLat,
  userLng,
  currentPage,
  totalPages,
  onPageChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const overlaysRef = useRef<{ overlay: HtmlOverlayInstance; el: HTMLDivElement; id: string }[]>([])

  const [sdkReady, setSdkReady] = useState(false)
  const [sdkError, setSdkError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const onItemSelectRef = useRef(onItemSelect)
  onItemSelectRef.current = onItemSelect
  const onItemNavigateRef = useRef(onItemNavigate)
  onItemNavigateRef.current = onItemNavigate
  const onMapIdleRef = useRef(onMapIdle)
  onMapIdleRef.current = onMapIdle
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId

  // items map for lookup
  const itemsMapRef = useRef(new Map<string, MapDiscoveryItem>())
  useEffect(() => {
    itemsMapRef.current = new Map(items.map((i) => [i.id, i]))
  }, [items])

  const handleSelect = useCallback((id: string) => {
    const item = itemsMapRef.current.get(id)
    if (!item) return
    if (selectedIdRef.current === id) {
      onItemNavigateRef.current(item)
    } else {
      setSelectedId(id)
      onItemSelectRef.current(item)
    }
  }, [])

  // SDK 로드
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) {
      setSdkError(true)
      return
    }
    loadGoogleMaps()
      .then(() => setSdkReady(true))
      .catch(() => setSdkError(true))
  }, [])

  // 맵 초기화
  useEffect(() => {
    if (!sdkReady || !containerRef.current) return

    // 최초 center 결정: 1) 내 위치 → 2) items centroid → 3) 서울 시청
    const geoItems = items.filter((i) => i.lat !== 0 && i.lng !== 0)
    let centerLat = DEFAULT_LAT
    let centerLng = DEFAULT_LNG
    let initialZoom = DEFAULT_ZOOM

    if (userLat != null && userLng != null) {
      centerLat = userLat
      centerLng = userLng
      initialZoom = MY_LOCATION_ZOOM
    } else if (geoItems.length > 0) {
      centerLat = geoItems.reduce((s, i) => s + i.lat, 0) / geoItems.length
      centerLng = geoItems.reduce((s, i) => s + i.lng, 0) / geoItems.length
    }

    const map = new google.maps.Map(containerRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: initialZoom,
      styles: MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: false,
      clickableIcons: false,
      gestureHandling: 'greedy',
      keyboardShortcuts: false,
    })
    mapRef.current = map

    // idle → onMapIdle (debounce)
    let debounceTimer: ReturnType<typeof setTimeout>
    const idleListener = map.addListener('idle', () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        const c = map.getCenter()
        const z = map.getZoom()
        if (!c || z == null) return
        const b = map.getBounds()
        const bounds = b ? {
          north: b.getNorthEast().lat(),
          south: b.getSouthWest().lat(),
          east: b.getNorthEast().lng(),
          west: b.getSouthWest().lng(),
        } : null
        onMapIdleRef.current({ lat: c.lat(), lng: c.lng() }, z, bounds)
      }, 200)
    })

    // 리사이즈 대응
    const container = containerRef.current
    const observer = new ResizeObserver(() => {
      const currentCenter = map.getCenter()
      google.maps.event.trigger(map, 'resize')
      if (currentCenter) {
        map.setCenter(currentCenter)
      }
    })
    observer.observe(container)

    return () => {
      clearTimeout(debounceTimer)
      idleListener.remove()
      observer.disconnect()
    }
    // 맵 초기화는 sdkReady 시 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady])

  // items → 오버레이 갱신 (모두 개별 도트)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // 기존 오버레이 제거
    overlaysRef.current.forEach((o) => o.overlay.setMap(null))
    overlaysRef.current = []

    items.forEach((item, idx) => {
      const position = new google.maps.LatLng(item.lat, item.lng)
      const el = document.createElement('div')
      el.innerHTML = createDotHtml(selectedIdRef.current === item.id, item.name)
      el.addEventListener('click', () => handleSelect(item.id))

      const overlay = createHtmlOverlay({
        position,
        content: el,
        zIndex: selectedIdRef.current === item.id ? 100 : items.length - idx,
        map,
      })
      overlaysRef.current.push({ overlay, el, id: item.id })
    })
  }, [items, handleSelect])

  // 선택 상태 변경 → 도트 비주얼 업데이트
  useEffect(() => {
    for (const entry of overlaysRef.current) {
      const item = itemsMapRef.current.get(entry.id)
      if (!item) continue
      const isSelected = entry.id === selectedId
      entry.el.innerHTML = createDotHtml(isSelected, item.name)
      entry.overlay.setZIdx(isSelected ? 100 : 1)
    }
  }, [selectedId])

  // 내 위치 마커
  const myLocationOverlayRef = useRef<HtmlOverlayInstance | null>(null)

  const moveToMyLocation = useCallback(() => {
    if (!mapRef.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current
        if (!map) return
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        map.setCenter({ lat, lng })
        map.setZoom(MY_LOCATION_ZOOM)

        // 기존 내 위치 마커 제거
        myLocationOverlayRef.current?.setMap(null)

        // 내 위치 마커 표시 (파란 점 + 펄스)
        const el = document.createElement('div')
        el.innerHTML = `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="
            width:12px;height:12px;border-radius:50%;
            background:#4285F4;
            border:2px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,0.3);
          "></div>
          <div style="
            position:absolute;
            width:24px;height:24px;border-radius:50%;
            background:rgba(66,133,244,0.2);
            animation:pulse 2s ease-out infinite;
          "></div>
        </div>`

        const overlay = createHtmlOverlay({
          position: new google.maps.LatLng(lat, lng),
          content: el,
          zIndex: 200,
          map,
        })
        myLocationOverlayRef.current = overlay
      },
      () => { /* 위치 권한 거부 시 무시 */ },
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [])

  // SDK 에러 또는 키 미설정 → 폴백
  if (sdkError || !GOOGLE_MAPS_KEY) {
    return (
      <div>
        <div
          className="relative overflow-hidden"
          style={{
            height: '320px',
            borderRadius: '0 0 16px 16px',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <MapPinned size={32} style={{ color: 'var(--text-hint)' }} />
            <span className="text-[13px]" style={{ color: 'var(--text-hint)' }}>
              지도를 불러올 수 없습니다
            </span>
          </div>
        </div>
        <MapItemList
          items={items}
          selectedId={selectedId}
          onSelect={handleSelect}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '0 12px' }}>
      <div
        style={{
          position: 'relative',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <div
          ref={containerRef}
          className="map-clean"
          style={{
            width: '100%',
            height: '320px',
            backgroundColor: 'var(--bg-elevated)',
          }}
        />
        <button
          type="button"
          onClick={moveToMyLocation}
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            border: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            opacity: 0.5,
          }}
          title="내 위치로 이동"
        >
          <LocateFixed size={14} style={{ color: '#666' }} />
        </button>
        {isNearbyLoading && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '2px 10px',
              borderRadius: '12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              fontSize: '11px',
              color: 'var(--text-hint)',
              zIndex: 10,
            }}
          >
            주변 검색 중...
          </div>
        )}
      </div>
      <MapItemList
        items={items}
        selectedId={selectedId}
        onSelect={handleSelect}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  )
}

/** 리스트 영역: 아이템 목록 + 페이지네이션 */
function MapItemList({
  items,
  selectedId,
  onSelect,
  currentPage,
  totalPages,
  onPageChange,
}: {
  items: MapDiscoveryItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="pt-3">
      {items.length > 0 && (
        <p
          className="px-3 pb-1 pt-1 text-[12px] font-medium"
          style={{ color: 'var(--text-hint)' }}
        >
          {items.length}곳
        </p>
      )}
      {items.map((item) => (
        <MapCompactItem
          key={item.id}
          name={item.name}
          genre={item.genre}
          distanceKm={item.distanceKm}
          myScore={item.myScore}
          followingScore={item.followingScore}
          bubbleScore={item.bubbleScore}
          nyamScore={item.nyamScore}
          googleRating={item.googleRating}
          prestige={item.prestige}
          inNyamDb={item.inNyamDb}
          isSelected={selectedId === item.id}
          onClick={() => onSelect(item.id)}
        />
      ))}
      {items.length === 0 && (
        <div className="py-8 text-center">
          <MapPinned
            size={32}
            style={{ color: 'var(--text-hint)', margin: '0 auto 8px' }}
          />
          <p
            className="text-[13px]"
            style={{ color: 'var(--text-hint)' }}
          >
            조건에 맞는 식당이 없어요
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: 'var(--text-hint)' }}
          >
            필터를 조정하거나 지도를 이동해 보세요
          </p>
        </div>
      )}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-center gap-3 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="rounded-md px-3 py-1 text-[12px] font-medium"
            style={{
              color: currentPage <= 1 ? 'var(--text-hint)' : 'var(--accent-food)',
              opacity: currentPage <= 1 ? 0.4 : 1,
            }}
          >
            이전
          </button>
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-sub)' }}>
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="rounded-md px-3 py-1 text-[12px] font-medium"
            style={{
              color: currentPage >= totalPages ? 'var(--text-hint)' : 'var(--accent-food)',
              opacity: currentPage >= totalPages ? 0.4 : 1,
            }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
