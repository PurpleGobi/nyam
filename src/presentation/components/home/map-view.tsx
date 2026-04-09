'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { MapPinned, LocateFixed } from 'lucide-react'
import { CompactListItem } from '@/presentation/components/home/compact-list-item'
import type { RestaurantRp } from '@/domain/entities/restaurant'

export interface MapRecord {
  restaurantId: string
  name: string
  genre: string
  area: string
  lat: number
  lng: number
  score: number | null
  distanceKm: number | null
  photoUrl?: string | null
  rp?: RestaurantRp[]
}

interface NearbyPlace {
  id: string
  name: string
  genre: string | null
  area: string | null
  address: string | null
  lat: number
  lng: number
  distance: number
  rp: Array<{ type: string }>
}

interface MapViewProps {
  records: MapRecord[]
  onNavigate: (restaurantId: string) => void
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

/** Google Maps 스타일 — POI·교통 라벨 숨기기 */
const MAP_STYLES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
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

/* ─────────── 마커 HTML 생성 (SDK 무관 — 기존 코드 유지) ─────────── */

function createPinHtml(score: number | null, selected: boolean, name?: string): string {
  const label = score != null ? String(score) : '\u00B7'
  const bg = selected ? '#c0392b' : 'var(--accent-food)'
  const size = selected ? 28 : 22
  const fontSize = selected ? 11 : 9
  const shadow = selected
    ? '0 3px 10px rgba(0,0,0,0.4)'
    : '0 1px 4px rgba(0,0,0,0.25)'
  const nameTag = selected && name
    ? `<div style="
        position:absolute;top:100%;left:50%;transform:translateX(-50%);
        margin-top:3px;white-space:nowrap;
        padding:1px 6px;border-radius:4px;
        background:rgba(0,0,0,0.75);
        font-size:10px;font-weight:600;color:#fff;
        pointer-events:none;
      ">${name}</div>`
    : ''
  return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};
      display:flex;align-items:center;justify-content:center;
      box-shadow:${shadow};cursor:pointer;
      transition:all 0.2s ease;
      border:2px solid white;
    "><span style="
      font-size:${fontSize}px;font-weight:700;color:#fff;
    ">${label}</span></div>
    ${nameTag}
  </div>`
}

const MICHELIN_SVG = `<svg width="12" height="12" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#E2001A"/>
  <ellipse cx="50" cy="30" rx="10" ry="16" fill="#fff"/>
  <ellipse cx="50" cy="30" rx="10" ry="16" fill="#fff" transform="rotate(60 50 50)"/>
  <ellipse cx="50" cy="30" rx="10" ry="16" fill="#fff" transform="rotate(120 50 50)"/>
  <ellipse cx="50" cy="30" rx="10" ry="16" fill="#fff" transform="rotate(180 50 50)"/>
  <ellipse cx="50" cy="30" rx="10" ry="16" fill="#fff" transform="rotate(240 50 50)"/>
  <ellipse cx="50" cy="30" rx="10" ry="16" fill="#fff" transform="rotate(300 50 50)"/>
</svg>`

const BLUERIBBON_SVG = `<svg width="12" height="12" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#1B4B94"/>
  <path d="M50 44 C40 30,12 14,14 38 C16 54,40 58,50 48Z" fill="#fff"/>
  <path d="M50 44 C60 30,88 14,86 38 C84 54,60 58,50 48Z" fill="#fff"/>
  <path d="M48 54 C38 60,18 82,26 84 C32 85,42 68,48 58Z" fill="#fff"/>
  <path d="M52 54 C62 60,82 82,74 84 C68 85,58 68,52 58Z" fill="#fff"/>
  <circle cx="50" cy="50" r="7" fill="#fff"/>
</svg>`

function getPrestigeBadges(rp: Array<{ type: string }>): string {
  if (rp.length === 0) return ''
  const badges: string[] = []
  const hasMichelin = rp.some((p) => p.type === 'michelin')
  const hasBlueRibbon = rp.some((p) => p.type === 'blue_ribbon')
  const hasTv = rp.some((p) => p.type === 'tv')
  if (hasMichelin) badges.push(`<span title="미슐랭">${MICHELIN_SVG}</span>`)
  if (hasBlueRibbon) badges.push(`<span title="블루리본">${BLUERIBBON_SVG}</span>`)
  if (hasTv) badges.push('<span style="font-size:8px;" title="TV출연">📺</span>')
  return `<div style="
    position:absolute;top:-6px;right:-8px;
    display:flex;gap:1px;
    pointer-events:none;
  ">${badges.join('')}</div>`
}

function createNearbyPinHtml(name: string, selected: boolean, rp: Array<{ type: string }> = []): string {
  const hasPrestige = rp.length > 0
  const bg = selected ? 'var(--text-sub)' : hasPrestige ? 'var(--accent-food)' : 'var(--text-hint)'
  const size = selected ? 22 : hasPrestige ? 20 : 16
  const shadow = selected
    ? '0 2px 8px rgba(0,0,0,0.3)'
    : '0 1px 3px rgba(0,0,0,0.15)'
  const nameTag = selected
    ? `<div style="
        position:absolute;top:100%;left:50%;transform:translateX(-50%);
        margin-top:3px;white-space:nowrap;
        padding:1px 6px;border-radius:4px;
        background:rgba(0,0,0,0.75);
        font-size:10px;font-weight:600;color:#fff;
        pointer-events:none;
      ">${name}</div>`
    : ''
  const badgeHtml = getPrestigeBadges(rp)
  return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
    <div style="
      position:relative;
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};
      display:flex;align-items:center;justify-content:center;
      box-shadow:${shadow};cursor:pointer;
      transition:all 0.2s ease;
      border:1.5px solid white;
    "><span style="
      font-size:${selected ? 9 : 7}px;font-weight:700;color:#fff;
    ">${hasPrestige ? '\u2605' : '+'}</span>${badgeHtml}</div>
    ${nameTag}
  </div>`
}

// 서울 시청 기본 좌표
const DEFAULT_LAT = 37.5665
const DEFAULT_LNG = 126.978

/** Google Maps 줌 레벨 → 대략적 반경(m) 변환 */
function zoomToRadius(zoom: number): number {
  const table: Record<number, number> = {
    18: 50, 17: 100, 16: 200, 15: 500,
    14: 1000, 13: 2000, 12: 4000, 11: 8000,
  }
  const clamped = Math.max(11, Math.min(18, Math.round(zoom)))
  return table[clamped] ?? 2000
}

/** 카카오 줌 레벨 5 ≈ Google 줌 14, 카카오 3 ≈ Google 16 */
const DEFAULT_ZOOM = 14
const MY_LOCATION_ZOOM = 16

export function MapView({ records, onNavigate }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const overlaysRef = useRef<{ overlay: HtmlOverlayInstance; el: HTMLDivElement; id: string }[]>([])
  const nearbyOverlaysRef = useRef<{ overlay: HtmlOverlayInstance; el: HTMLDivElement; id: string }[]>([])

  const [sdkReady, setSdkReady] = useState(false)
  const [sdkError, setSdkError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([])

  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId

  const geoRecordIds = records.filter((r) => r.lat !== 0 && r.lng !== 0).map((r) => r.restaurantId).join(',')
  const geoRecords = useMemo(
    () => records.filter((r) => r.lat !== 0 && r.lng !== 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geoRecordIds],
  )

  const handleSelect = useCallback((restaurantId: string) => {
    if (selectedIdRef.current === restaurantId) {
      onNavigateRef.current(restaurantId)
    } else {
      setSelectedId(restaurantId)
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

  const recordedIds = useMemo(
    () => new Set(geoRecords.map((r) => r.restaurantId)),
    [geoRecords],
  )

  const fetchNearby = useCallback(async (lat: number, lng: number, radius: number) => {
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(Math.min(radius, 20000)),
      })
      const res = await fetch(`/api/restaurants/nearby?${params}`)
      if (!res.ok) return
      const data = await res.json() as { restaurants: NearbyPlace[] }
      const filtered = data.restaurants.filter((p) => !recordedIds.has(p.id))
      setNearbyPlaces(filtered)
    } catch {
      // 실패 시 조용히 무시
    }
  }, [recordedIds])

  /** 주변 식당 오버레이 그리기 */
  const renderNearbyOverlays = useCallback((map: google.maps.Map, places: NearbyPlace[]) => {
    nearbyOverlaysRef.current.forEach((o) => o.overlay.setMap(null))
    nearbyOverlaysRef.current = []

    places.forEach((place) => {
      if (!place.lat || !place.lng) return
      const position = new google.maps.LatLng(place.lat, place.lng)
      const el = document.createElement('div')
      el.innerHTML = createNearbyPinHtml(place.name, false, place.rp)
      el.addEventListener('click', () => {
        if (selectedIdRef.current === place.id) {
          onNavigateRef.current(place.id)
        } else {
          setSelectedId(place.id)
        }
      })
      const overlay = createHtmlOverlay({
        position,
        content: el,
        zIndex: 0,
        map,
      })
      nearbyOverlaysRef.current.push({ overlay, el, id: place.id })
    })
  }, [])

  // 맵 초기화 + 오버레이
  useEffect(() => {
    if (!sdkReady || !containerRef.current) return

    let centerLat = DEFAULT_LAT
    let centerLng = DEFAULT_LNG

    if (geoRecords.length > 0) {
      centerLat = geoRecords.reduce((s, r) => s + r.lat, 0) / geoRecords.length
      centerLng = geoRecords.reduce((s, r) => s + r.lng, 0) / geoRecords.length
    }

    const map = new google.maps.Map(containerRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: geoRecords.length > 0 ? DEFAULT_ZOOM : MY_LOCATION_ZOOM,
      styles: MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
    })
    mapRef.current = map

    // 기존 오버레이 제거
    overlaysRef.current.forEach((o) => o.overlay.setMap(null))
    overlaysRef.current = []

    const bounds = new google.maps.LatLngBounds()

    geoRecords.forEach((record, idx) => {
      const position = new google.maps.LatLng(record.lat, record.lng)
      bounds.extend(position)

      const el = document.createElement('div')
      el.innerHTML = createPinHtml(record.score, false, record.name)
      el.addEventListener('click', () => handleSelect(record.restaurantId))

      const zIndex = geoRecords.length - idx

      const overlay = createHtmlOverlay({
        position,
        content: el,
        zIndex,
        map,
      })
      overlaysRef.current.push({ overlay, el, id: record.restaurantId })
    })

    if (geoRecords.length > 1) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
    }

    // 초기 주변 식당 로드
    const initialZoom = geoRecords.length > 0 ? DEFAULT_ZOOM : MY_LOCATION_ZOOM
    fetchNearby(centerLat, centerLng, zoomToRadius(initialZoom))

    // 지도 이동/줌 시 주변 식당 재검색 (500ms debounce)
    let debounceTimer: ReturnType<typeof setTimeout>
    const idleListener = map.addListener('idle', () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        const c = map.getCenter()
        const z = map.getZoom()
        if (!c || z == null) return
        fetchNearby(c.lat(), c.lng(), zoomToRadius(z))
      }, 500)
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
  }, [sdkReady, geoRecords, handleSelect, fetchNearby])

  // 주변 식당 오버레이 업데이트
  useEffect(() => {
    if (!mapRef.current) return
    renderNearbyOverlays(mapRef.current, nearbyPlaces)
  }, [nearbyPlaces, renderNearbyOverlays])

  // 선택 상태 변경 시 핀 비주얼 업데이트 + z-index
  useEffect(() => {
    const recordMap = new Map(geoRecords.map((r) => [r.restaurantId, r]))
    for (const item of overlaysRef.current) {
      const record = recordMap.get(item.id)
      if (!record) continue
      const isSelected = item.id === selectedId
      item.el.innerHTML = createPinHtml(record.score, isSelected, record.name)
      const listIdx = geoRecords.findIndex((r) => r.restaurantId === item.id)
      item.overlay.setZIdx(isSelected ? 100 : geoRecords.length - listIdx)
    }
    const nearbyMap = new Map(nearbyPlaces.map((p) => [p.id, p]))
    for (const item of nearbyOverlaysRef.current) {
      const place = nearbyMap.get(item.id)
      if (!place) continue
      const isSelected = item.id === selectedId
      item.el.innerHTML = createNearbyPinHtml(place.name, isSelected, place.rp)
      item.overlay.setZIdx(isSelected ? 100 : 0)
    }
  }, [selectedId, geoRecords, nearbyPlaces])

  const moveToMyLocation = useCallback(() => {
    if (!mapRef.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current
        if (!map) return
        map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        map.setZoom(MY_LOCATION_ZOOM)
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
        <MapList records={records} nearbyPlaces={[]} selectedId={selectedId} onSelect={handleSelect} />
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
            bottom: '12px',
            right: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
          title="내 위치로 이동"
        >
          <LocateFixed size={18} style={{ color: 'var(--text-sub)' }} />
        </button>
      </div>
      <MapList records={records} nearbyPlaces={nearbyPlaces} selectedId={selectedId} onSelect={handleSelect} />
    </div>
  )
}

function MapList({
  records,
  nearbyPlaces,
  selectedId,
  onSelect,
}: {
  records: MapRecord[]
  nearbyPlaces: NearbyPlace[]
  selectedId: string | null
  onSelect: (restaurantId: string) => void
}) {
  const totalCount = records.length + nearbyPlaces.length
  return (
    <div className="pt-3">
      {records.length > 0 && (
        <>
          <p
            className="px-4 pb-2 text-[13px] font-bold"
            style={{ color: 'var(--text-sub)' }}
          >
            내 기록 {records.length}곳
          </p>
          {records.map((record, i) => (
            <div
              key={record.restaurantId}
              data-restaurant-id={record.restaurantId}
              className="px-4"
              style={{
                backgroundColor: selectedId === record.restaurantId ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: selectedId === record.restaurantId ? '3px solid var(--accent-food)' : '3px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <CompactListItem
                rank={i + 1}
                photoUrl={record.photoUrl ?? null}
                name={record.name}
                meta={`${record.genre} · ${record.area}${record.distanceKm != null ? ` · ${record.distanceKm}km` : ''}`}
                score={record.score}
                axisX={null}
                axisY={null}
                accentType="restaurant"
                rp={record.rp}
                onClick={() => onSelect(record.restaurantId)}
              />
            </div>
          ))}
        </>
      )}
      {nearbyPlaces.length > 0 && (
        <>
          <p
            className="px-4 pb-2 pt-3 text-[13px] font-bold"
            style={{ color: 'var(--text-hint)' }}
          >
            주변 식당 {nearbyPlaces.length}곳
          </p>
          {nearbyPlaces.map((place) => (
            <div
              key={place.id}
              data-restaurant-id={place.id}
              className="px-4"
              style={{
                backgroundColor: selectedId === place.id ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: selectedId === place.id ? '3px solid var(--text-hint)' : '3px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <CompactListItem
                rank={null}
                photoUrl={null}
                name={place.name}
                meta={[place.genre, place.area, place.distance ? `${place.distance}m` : null].filter(Boolean).join(' · ')}
                score={null}
                axisX={null}
                axisY={null}
                accentType="restaurant"
                rp={place.rp as RestaurantRp[]}
                onClick={() => onSelect(place.id)}
              />
            </div>
          ))}
        </>
      )}
      {totalCount === 0 && (
        <p
          className="px-4 py-8 text-center text-[13px]"
          style={{ color: 'var(--text-hint)' }}
        >
          지도에 표시된 식당이 없어요
        </p>
      )}
    </div>
  )
}
