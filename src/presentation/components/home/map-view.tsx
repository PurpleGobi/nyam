'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
  thumbnailUrl?: string | null
}

interface MapViewProps {
  records: MapRecord[]
  onPinClick: (restaurantId: string) => void
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

/** 커스텀 오버레이 HTML 생성 */
function createPinHtml(score: number | null): string {
  const label = score != null ? String(score) : '·'
  return `<div style="
    width:32px;height:32px;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    background:var(--accent-food);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;
  "><span style="
    transform:rotate(45deg);
    font-size:11px;font-weight:700;color:#fff;
  ">${label}</span></div>`
}

// 서울 시청 기본 좌표
const DEFAULT_LAT = 37.5665
const DEFAULT_LNG = 126.978

export function MapView({ records, onPinClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([])
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkError, setSdkError] = useState(false)

  // 좌표가 있는 레코드만 필터
  const geoRecords = records.filter((r) => r.lat !== 0 && r.lng !== 0)

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

  // 맵 초기화 + 오버레이
  const initMap = useCallback(() => {
    if (!sdkReady || !containerRef.current) return

    // 센터 좌표 결정
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
    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    if (geoRecords.length === 0) return

    const bounds = new kakao.maps.LatLngBounds()

    geoRecords.forEach((record) => {
      const position = new kakao.maps.LatLng(record.lat, record.lng)
      bounds.extend(position)

      const el = document.createElement('div')
      el.innerHTML = createPinHtml(record.score)
      el.addEventListener('click', () => onPinClick(record.restaurantId))

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: el,
        yAnchor: 1,
        clickable: true,
      })
      overlay.setMap(map)
      overlaysRef.current.push(overlay)
    })

    if (geoRecords.length > 1) {
      map.setBounds(bounds, 50, 50, 50, 50)
    }
  }, [sdkReady, geoRecords, onPinClick])

  useEffect(() => {
    initMap()
  }, [initMap])

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
        {renderList(records, onPinClick)}
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
      {renderList(records, onPinClick)}
    </div>
  )
}

function renderList(
  records: MapRecord[],
  onPinClick: (restaurantId: string) => void,
) {
  return (
    <div className="pt-3">
      <p
        className="px-4 pb-2 text-[13px] font-bold"
        style={{ color: 'var(--text-sub)' }}
      >
        지도에 표시된 {records.length}곳
      </p>
      {records.map((record, i) => (
        <CompactListItem
          key={record.restaurantId}
          rank={i + 1}
          thumbnailUrl={record.thumbnailUrl ?? null}
          name={record.name}
          meta={`${record.genre} · ${record.area}${record.distanceKm != null ? ` · ${record.distanceKm}km` : ''}`}
          score={record.score}
          accentType="restaurant"
          onClick={() => onPinClick(record.restaurantId)}
        />
      ))}
    </div>
  )
}
