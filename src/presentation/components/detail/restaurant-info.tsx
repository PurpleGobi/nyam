'use client'

import { useState } from 'react'
import { MapPin, Phone, Clock, ChevronDown } from 'lucide-react'
import type { BusinessHours, MenuItem } from '@/domain/entities/restaurant'

interface RestaurantInfoProps {
  address: string | null
  lat: number | null
  lng: number | null
  hours: BusinessHours | null
  phone: string | null
  menus: MenuItem[]
  showMenuSection: boolean
}

const DAY_ORDER: (keyof BusinessHours)[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_NAMES: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
}

function getTodayKey(): keyof BusinessHours {
  const day = new Date().getDay() // 0=일, 1=월, ...
  const map: (keyof BusinessHours)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return map[day]
}

export function RestaurantInfo({
  address,
  lat,
  lng,
  hours,
  phone,
  menus,
  showMenuSection,
}: RestaurantInfoProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const hasAddress = !!address
  const hasPhone = !!phone
  const hasHours = hours && Object.keys(hours).length > 0
  const hasMenus = showMenuSection && menus.length > 0

  if (!hasAddress && !hasPhone && !hasHours && !hasMenus) return null

  // 오늘 영업 정보
  const todayKey = getTodayKey()
  const todayHours = hours?.[todayKey] ?? null

  return (
    <section style={{ padding: '16px 20px' }}>
      {/* 섹션 헤더 */}
      <div className="mb-3.5">
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          정보
        </span>
      </div>

      <div className="flex flex-col">
        {/* 주소 + 미니 지도 */}
        {hasAddress && (
          <div
            className="flex items-start gap-2.5"
            style={{ padding: '8px 0', borderBottom: '1px solid #F0EDE8' }}
          >
            <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--text-sub)' }} />
            <div className="flex-1">
              <button
                type="button"
                onClick={() => {
                  if (lat && lng) {
                    window.open(`https://map.kakao.com/link/map/${encodeURIComponent(address ?? '')},${lat},${lng}`, '_blank')
                  }
                }}
                className="text-left"
              >
                <span style={{ fontSize: '13px', color: 'var(--text)' }}>{address}</span>
              </button>
              {lat && lng && (
                <div
                  className="mt-1.5 flex items-center justify-center overflow-hidden rounded-lg"
                  style={{
                    height: '120px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    window.open(`https://map.kakao.com/link/map/${encodeURIComponent(address ?? '')},${lat},${lng}`, '_blank')
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <MapPin size={20} style={{ color: 'var(--accent-food)' }} />
                    <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>
                      지도에서 보기
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 영업시간 */}
        {hasHours && (
          <div
            className="flex items-start gap-2.5"
            style={{ padding: '8px 0', borderBottom: '1px solid #F0EDE8' }}
          >
            <Clock size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--text-sub)' }} />
            <div>
              {todayHours ? (
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--positive)' }}>
                    영업 중
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                    · {todayHours}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-hint)' }}>
                  오늘 휴무
                </span>
              )}
              <div className="mt-1 flex flex-col gap-0.5">
                {DAY_ORDER.map((day) => {
                  const h = hours?.[day]
                  if (!h) return null
                  return (
                    <div key={day} className="flex gap-2">
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', width: '16px' }}>
                        {DAY_NAMES[day]}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text)' }}>{h}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* 전화 */}
        {hasPhone && (
          <div
            className="flex items-center justify-between gap-2.5"
            style={{
              padding: '8px 0',
              borderBottom: hasMenus ? '1px solid #F0EDE8' : undefined,
            }}
          >
            <div className="flex items-center gap-2.5">
              <Phone size={16} style={{ color: 'var(--text-sub)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text)' }}>{phone}</span>
            </div>
            <a
              href={`tel:${phone}`}
              style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-food)' }}
            >
              전화하기
            </a>
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
