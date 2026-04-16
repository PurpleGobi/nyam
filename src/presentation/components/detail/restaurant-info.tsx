'use client'

import { useState } from 'react'
import { MapPin, Phone, Clock, ChevronDown, ExternalLink } from 'lucide-react'
import type { BusinessHours, MenuItem } from '@/domain/entities/restaurant'
import { MiniMapView } from '@/presentation/components/detail/mini-map-view'

const DAY_NAMES: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
}

function getTodayKey(): keyof BusinessHours {
  const day = new Date().getDay()
  const map: (keyof BusinessHours)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return map[day]
}

interface RestaurantInfoProps {
  address?: string | null
  hours?: BusinessHours | null
  phone?: string | null
  lat: number | null
  lng: number | null
  name: string
  menus: MenuItem[]
  showMenuSection: boolean
  externalIdKakao?: string | null
  externalIdNaver?: string | null
  externalIdGoogle?: string | null
}

export function RestaurantInfo({
  address,
  hours,
  phone,
  lat,
  lng,
  name,
  menus,
  showMenuSection,
  externalIdKakao,
  externalIdNaver,
  externalIdGoogle,
}: RestaurantInfoProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const hasLocation = !!(lat && lng)
  const hasMenus = showMenuSection && menus.length > 0
  const hasAddress = !!address
  const hasHours = !!(hours && Object.keys(hours).length > 0)
  const hasPhone = !!phone
  const todayKey = getTodayKey()
  const todayHours = hours?.[todayKey] ?? null

  if (!hasLocation && !hasMenus && !hasAddress && !hasHours && !hasPhone) return null

  const encodedName = encodeURIComponent(name)
  const kakaoMapUrl = hasLocation
    ? externalIdKakao
      ? `https://place.map.kakao.com/${externalIdKakao}`
      : `https://map.kakao.com/?q=${encodedName}&x=${lng}&y=${lat}`
    : null
  const naverMapUrl = hasLocation
    ? externalIdNaver
      ? `https://map.naver.com/v5/entry/place/${externalIdNaver}`
      : `https://map.naver.com/v5/search/${encodedName}?c=${lng},${lat},15,0,0,0,dh`
    : null
  const googleMapUrl = hasLocation
    ? externalIdGoogle
      ? `https://www.google.com/maps/place/?q=place_id:${externalIdGoogle}`
      : `https://www.google.com/maps/search/${encodedName}/@${lat},${lng},17z`
    : null

  return (
    <section style={{ padding: '16px 20px' }}>
      {/* 섹션 헤더 */}
      <div className="mb-3.5">
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          정보
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {/* 주소 */}
        {hasAddress && (
          <p className="flex items-center gap-1.5" style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
            <MapPin size={14} className="shrink-0" style={{ color: 'var(--text-hint)' }} />
            {address}
          </p>
        )}

        {/* 영업시간 */}
        {hasHours && (
          <p className="flex items-center gap-1.5" style={{ fontSize: '13px' }}>
            <Clock size={14} className="shrink-0" style={{ color: 'var(--text-hint)' }} />
            {todayHours ? (
              <>
                <span style={{ color: 'var(--positive)', fontWeight: 600 }}>영업 중</span>
                <span style={{ color: 'var(--text-sub)' }}>· {todayHours}</span>
              </>
            ) : (
              <span style={{ color: 'var(--text-hint)' }}>오늘 휴무</span>
            )}
          </p>
        )}

        {/* 전화번호 */}
        {hasPhone && (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1.5"
            style={{ fontSize: '13px', color: 'var(--accent-food)' }}
          >
            <Phone size={14} className="shrink-0" />
            <span>{phone}</span>
          </a>
        )}

        {/* 지도 링크들 */}
        {hasLocation && (
          <div
            className="flex flex-col gap-2"
            style={{ padding: '8px 0', borderBottom: hasMenus ? '1px solid #F0EDE8' : undefined }}
          >
            {/* 미니 지도 */}
            <MiniMapView lat={lat} lng={lng} height={140} />

            {/* 지도 앱 링크 버튼들 */}
            <div className="flex items-center gap-2">
              {kakaoMapUrl && (
                <a
                  href={kakaoMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2"
                  style={{ backgroundColor: '#FEE500', color: '#191919', fontSize: '12px', fontWeight: 600 }}
                >
                  카카오맵
                  <ExternalLink size={12} />
                </a>
              )}
              {naverMapUrl && (
                <a
                  href={naverMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2"
                  style={{ backgroundColor: '#03C75A', color: 'var(--text-inverse)', fontSize: '12px', fontWeight: 600 }}
                >
                  네이버지도
                  <ExternalLink size={12} />
                </a>
              )}
              {googleMapUrl && (
                <a
                  href={googleMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2"
                  style={{ backgroundColor: '#4285F4', color: 'var(--text-inverse)', fontSize: '12px', fontWeight: 600 }}
                >
                  구글맵
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* 메뉴 (접이식, 내 기록 모드에서만) */}
        {hasMenus && (
          <div style={{ padding: '8px 0' }}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2"
              style={{ backgroundColor: '#F0EDE8' }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                메뉴 보기
              </span>
              <ChevronDown
                size={16}
                style={{
                  color: 'var(--text-sub)',
                  transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              />
            </button>
            {menuOpen && (
              <div className="mt-2 flex flex-col">
                {menus.map((menu, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5"
                    style={{
                      borderBottom: i < menus.length - 1 ? '1px solid #F0EDE8' : undefined,
                    }}
                  >
                    <span style={{ fontSize: '13px', color: 'var(--text)' }}>{menu.name}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>
                      {menu.price.toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
