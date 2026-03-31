'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { MapPinned } from 'lucide-react'
import { CompactListItem } from '@/presentation/components/home/compact-list-item'

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
  const scale = selected ? 'scale(1.45)' : 'scale(1)'
  const fontSize = selected ? 13 : 11
  const shadow = selected
    ? '0 4px 14px rgba(0,0,0,0.45)'
    : '0 2px 6px rgba(0,0,0,0.25)'
  const nameTag = selected && name
    ? `<div style="
        position:absolute;top:100%;left:0;transform:translateX(-50%);
        margin-top:4px;white-space:nowrap;
        padding:2px 8px;border-radius:6px;
        background:rgba(0,0,0,0.75);
        font-size:11px;font-weight:600;color:#fff;
        pointer-events:none;
      ">${name}</div>`
    : ''
  return `<div style="position:relative;">
    <div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      transform-origin:0% 100%;
      transform:rotate(-45deg) ${scale};
      background:${bg};
      display:flex;align-items:center;justify-content:center;
      box-shadow:${shadow};cursor:pointer;
      transition:all 0.2s ease;
    "><span style="
      transform:rotate(45deg);
      font-size:${fontSize}px;font-weight:700;color:#fff;
    ">${label}</span></div>
    ${nameTag}
  </div>`
}

// 서울 시청 기본 좌표
const DEFAULT_LAT = 37.5665
const DEFAULT_LNG = 126.978

export function MapView({ records, onNavigate }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const overlaysRef = useRef<{ overlay: kakao.maps.CustomOverlay; el: HTMLDivElement; id: string }[]>([])

  const [sdkReady, setSdkReady] = useState(false)
  const [sdkError, setSdkError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
    const map = new kakao.maps.Map(containerRef.current, { center, level: 5 })
    mapRef.current = map

    // 기존 오버레이 제거
    overlaysRef.current.forEach((o) => o.overlay.setMap(null))
    overlaysRef.current = []

    if (geoRecords.length === 0) return

    const bounds = new kakao.maps.LatLngBounds()

    geoRecords.forEach((record, idx) => {
      const position = new kakao.maps.LatLng(record.lat, record.lng)
      bounds.extend(position)

      const el = document.createElement('div')
      el.innerHTML = createPinHtml(record.score, false, record.name)
      el.onclick = () => handleSelect(record.restaurantId)

      // 리스트 순서와 일치하도록 상위 항목이 더 높은 zIndex
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
  }, [sdkReady, geoRecords, handleSelect])

  // 선택 상태 변경 시 핀 비주얼 업데이트 + z-index + 목록 스크롤
  useEffect(() => {
    const recordMap = new Map(geoRecords.map((r) => [r.restaurantId, r]))
    for (const item of overlaysRef.current) {
      const record = recordMap.get(item.id)
      if (!record) continue
      const isSelected = item.id === selectedId
      item.el.innerHTML = createPinHtml(record.score, isSelected, record.name)
      // onclick은 재할당하지 않음 — initMap에서 한 번만 등록
      const listIdx = geoRecords.findIndex((r) => r.restaurantId === item.id)
      item.overlay.setZIndex(isSelected ? 100 : geoRecords.length - listIdx)
    }
  }, [selectedId, geoRecords])

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
        <MapList records={records} selectedId={selectedId} onSelect={handleSelect} />
      </div>
    )
  }

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          height: '320px',
          borderRadius: '0 0 16px 16px',
          backgroundColor: 'var(--bg-elevated)',
        }}
      />
      <MapList records={records} selectedId={selectedId} onSelect={handleSelect} />
    </div>
  )
}

function MapList({
  records,
  selectedId,
  onSelect,
}: {
  records: MapRecord[]
  selectedId: string | null
  onSelect: (restaurantId: string) => void
}) {
  return (
    <div className="pt-3">
      <p
        className="px-4 pb-2 text-[13px] font-bold"
        style={{ color: 'var(--text-sub)' }}
      >
        지도에 표시된 {records.length}곳
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
            accentType="restaurant"
            onClick={() => onSelect(record.restaurantId)}
          />
        </div>
      ))}
    </div>
  )
}
