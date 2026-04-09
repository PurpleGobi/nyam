'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
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

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY

/** 카카오맵 SDK 로드 (한 번만) */
function loadKakaoSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'))

    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve())
      return
    }

    const existing = document.getElementById('kakao-map-sdk')
    if (existing) {
      const check = () => {
        if (window.kakao?.maps) {
          window.kakao.maps.load(() => resolve())
        } else {
          setTimeout(check, 100)
        }
      }
      check()
      return
    }

    const script = document.createElement('script')
    script.id = 'kakao-map-sdk'
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`
    script.onload = () => {
      window.kakao.maps.load(() => resolve())
    }
    script.onerror = () => reject(new Error('카카오맵 SDK 로드 실패'))
    document.head.appendChild(script)
  })
}

/** 커스텀 오버레이 HTML 생성
 *  꼭지점(tip)은 border-radius 50% 50% 50% 0 의 좌하단.
 *  transform-origin을 그 꼭지점에 고정하여 scale 시 tip 위치 불변.
 */
function createPinHtml(score: number | null, selected: boolean, name?: string): string {
  const label = score != null ? String(score) : '·'
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

/** rp → 뱃지 아이콘 매핑 */
function getPrestigeBadges(rp: Array<{ type: string }>): string {
  if (rp.length === 0) return ''
  const badges: string[] = []
  const hasMichelin = rp.some((p) => p.type === 'michelin')
  const hasBlueRibbon = rp.some((p) => p.type === 'blue_ribbon')
  const hasTv = rp.some((p) => p.type === 'tv')
  if (hasMichelin) badges.push('<span style="font-size:8px;" title="미슐랭">⭐</span>')
  if (hasBlueRibbon) badges.push('<span style="font-size:8px;" title="블루리본">🎀</span>')
  if (hasTv) badges.push('<span style="font-size:8px;" title="TV출연">📺</span>')
  return `<div style="
    position:absolute;top:-6px;right:-8px;
    display:flex;gap:1px;
    pointer-events:none;
  ">${badges.join('')}</div>`
}

/** 주변 식당 핀 — 회색 작은 원형 + prestige 뱃지 */
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
    ">${hasPrestige ? '★' : '+'}</span>${badgeHtml}</div>
    ${nameTag}
  </div>`
}

// 서울 시청 기본 좌표
const DEFAULT_LAT = 37.5665
const DEFAULT_LNG = 126.978

/** 카카오맵 레벨 → 대략적 반경(m) 변환 */
function levelToRadius(level: number): number {
  const table: Record<number, number> = {
    1: 50, 2: 100, 3: 200, 4: 500, 5: 1000, 6: 2000, 7: 4000, 8: 8000,
  }
  return table[level] ?? 2000
}

export function MapView({ records, onNavigate }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const overlaysRef = useRef<{ overlay: kakao.maps.CustomOverlay; el: HTMLDivElement; id: string }[]>([])
  const nearbyOverlaysRef = useRef<{ overlay: kakao.maps.CustomOverlay; el: HTMLDivElement; id: string }[]>([])

  const [sdkReady, setSdkReady] = useState(false)
  const [sdkError, setSdkError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([])

  // ref로 콜백 안정화 — 클로저 갱신은 되지만 참조는 불변
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId

  // 좌표가 있는 레코드만 (참조 안정화)
  const geoRecordIds = records.filter((r) => r.lat !== 0 && r.lng !== 0).map((r) => r.restaurantId).join(',')
  const geoRecords = useMemo(
    () => records.filter((r) => r.lat !== 0 && r.lng !== 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geoRecordIds],
  )

  /** 핀/카드 클릭 핸들러: 첫 클릭 → 선택, 재클릭 → 네비게이트 */
  const handleSelect = useCallback((restaurantId: string) => {
    if (selectedIdRef.current === restaurantId) {
      onNavigateRef.current(restaurantId)
    } else {
      setSelectedId(restaurantId)
    }
  }, [])

  // SDK 로드
  useEffect(() => {
    if (!KAKAO_JS_KEY) {
      setSdkError(true)
      return
    }
    loadKakaoSdk()
      .then(() => setSdkReady(true))
      .catch(() => setSdkError(true))
  }, [])

  /** 주변 식당 fetch — 기록된 식당 ID를 제외 */
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
  const renderNearbyOverlays = useCallback((map: kakao.maps.Map, places: NearbyPlace[]) => {
    nearbyOverlaysRef.current.forEach((o) => o.overlay.setMap(null))
    nearbyOverlaysRef.current = []

    places.forEach((place) => {
      if (!place.lat || !place.lng) return
      const position = new kakao.maps.LatLng(place.lat, place.lng)
      const el = document.createElement('div')
      el.innerHTML = createNearbyPinHtml(place.name, false, place.rp)
      el.onclick = () => {
        if (selectedIdRef.current === place.id) {
          onNavigateRef.current(place.id)
        } else {
          setSelectedId(place.id)
        }
      }
      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: el,
        yAnchor: 1,
        clickable: true,
        zIndex: 0,
      })
      overlay.setMap(map)
      nearbyOverlaysRef.current.push({ overlay, el, id: place.id })
    })
  }, [])

  // 맵 초기화 + 오버레이 (geoRecords·handleSelect 참조 안정)
  useEffect(() => {
    if (!sdkReady || !containerRef.current) return

    let centerLat = DEFAULT_LAT
    let centerLng = DEFAULT_LNG

    if (geoRecords.length > 0) {
      centerLat = geoRecords.reduce((s, r) => s + r.lat, 0) / geoRecords.length
      centerLng = geoRecords.reduce((s, r) => s + r.lng, 0) / geoRecords.length
    }

    const center = new kakao.maps.LatLng(centerLat, centerLng)
    const level = geoRecords.length > 0 ? 5 : 3
    const map = new kakao.maps.Map(containerRef.current, { center, level })
    mapRef.current = map

    // 기존 오버레이 제거
    overlaysRef.current.forEach((o) => o.overlay.setMap(null))
    overlaysRef.current = []

    const bounds = new kakao.maps.LatLngBounds()

    geoRecords.forEach((record, idx) => {
      const position = new kakao.maps.LatLng(record.lat, record.lng)
      bounds.extend(position)

      const el = document.createElement('div')
      el.innerHTML = createPinHtml(record.score, false, record.name)
      el.onclick = () => handleSelect(record.restaurantId)

      const zIndex = geoRecords.length - idx

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: el,
        yAnchor: 1,
        clickable: true,
        zIndex,
      })
      overlay.setMap(map)
      overlaysRef.current.push({ overlay, el, id: record.restaurantId })
    })

    if (geoRecords.length > 1) {
      map.setBounds(bounds, 50, 50, 50, 50)
    }

    // 초기 주변 식당 로드
    fetchNearby(centerLat, centerLng, levelToRadius(level))

    // 지도 이동/줌 시 주변 식당 재검색 (500ms debounce)
    let debounceTimer: ReturnType<typeof setTimeout>
    const handleIdle = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        const c = map.getCenter()
        const r = levelToRadius(map.getLevel())
        fetchNearby(c.getLat(), c.getLng(), r)
      }, 500)
    }
    kakao.maps.event.addListener(map, 'idle', handleIdle)

    // 리사이즈 대응
    const container = containerRef.current
    const observer = new ResizeObserver(() => {
      const currentCenter = map.getCenter()
      map.relayout()
      map.setCenter(currentCenter)
    })
    observer.observe(container)

    return () => {
      clearTimeout(debounceTimer)
      kakao.maps.event.removeListener(map, 'idle', handleIdle)
      observer.disconnect()
    }
  }, [sdkReady, geoRecords, handleSelect, fetchNearby])

  // 주변 식당 오버레이 업데이트
  useEffect(() => {
    if (!mapRef.current) return
    renderNearbyOverlays(mapRef.current, nearbyPlaces)
  }, [nearbyPlaces, renderNearbyOverlays])

  // 선택 상태 변경 시 핀 비주얼 업데이트 + z-index + 목록 스크롤
  useEffect(() => {
    // 기록된 식당 핀
    const recordMap = new Map(geoRecords.map((r) => [r.restaurantId, r]))
    for (const item of overlaysRef.current) {
      const record = recordMap.get(item.id)
      if (!record) continue
      const isSelected = item.id === selectedId
      item.el.innerHTML = createPinHtml(record.score, isSelected, record.name)
      const listIdx = geoRecords.findIndex((r) => r.restaurantId === item.id)
      item.overlay.setZIndex(isSelected ? 100 : geoRecords.length - listIdx)
    }
    // 주변 식당 핀
    const nearbyMap = new Map(nearbyPlaces.map((p) => [p.id, p]))
    for (const item of nearbyOverlaysRef.current) {
      const place = nearbyMap.get(item.id)
      if (!place) continue
      const isSelected = item.id === selectedId
      item.el.innerHTML = createNearbyPinHtml(place.name, isSelected, place.rp)
      item.overlay.setZIndex(isSelected ? 100 : 0)
    }
  }, [selectedId, geoRecords, nearbyPlaces])

  const moveToMyLocation = useCallback(() => {
    if (!mapRef.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current
        if (!map) return
        const latlng = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)
        map.setCenter(latlng)
        map.setLevel(3)
      },
      () => { /* 위치 권한 거부 시 무시 */ },
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [])

  // SDK 에러 또는 키 미설정 → 폴백
  if (sdkError || !KAKAO_JS_KEY) {
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
