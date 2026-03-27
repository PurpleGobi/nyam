'use client'

import { MapPin, Phone, Clock } from 'lucide-react'
import type { Restaurant } from '@/domain/entities/restaurant'

interface RestaurantInfoProps {
  restaurant: Restaurant
}

const DAY_LABELS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_NAMES: globalThis.Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
}

export function RestaurantInfo({ restaurant }: RestaurantInfoProps) {
  const hasAddress = restaurant.address || restaurant.area
  const hasPhone = restaurant.phone
  const hasHours = restaurant.hours && Object.keys(restaurant.hours).length > 0
  const hasMenus = restaurant.menus && restaurant.menus.length > 0

  if (!hasAddress && !hasPhone && !hasHours && !hasMenus) return null

  return (
    <div className="flex flex-col gap-4 px-4">
      {hasAddress && (
        <div className="flex items-start gap-2.5">
          <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--text-hint)' }} />
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text)' }}>{restaurant.address}</p>
            {restaurant.area && (
              <p style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{restaurant.area}</p>
            )}
          </div>
        </div>
      )}

      {hasPhone && (
        <div className="flex items-center gap-2.5">
          <Phone size={16} style={{ color: 'var(--text-hint)' }} />
          <a
            href={`tel:${restaurant.phone}`}
            style={{ fontSize: '14px', color: 'var(--accent-food)', textDecoration: 'underline' }}
          >
            {restaurant.phone}
          </a>
        </div>
      )}

      {hasHours && restaurant.hours && (
        <div className="flex items-start gap-2.5">
          <Clock size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--text-hint)' }} />
          <div className="flex flex-col gap-0.5">
            {DAY_LABELS.map((day) => {
              const hours = restaurant.hours?.[day]
              if (!hours) return null
              return (
                <div key={day} className="flex gap-2">
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', width: '20px' }}>
                    {DAY_NAMES[day]}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text)' }}>{hours}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {hasMenus && restaurant.menus && (
        <div>
          <h4 className="mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
            대표 메뉴
          </h4>
          <div className="flex flex-col gap-1.5">
            {restaurant.menus.map((menu, i) => (
              <div key={i} className="flex items-center justify-between">
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>{menu.name}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)' }}>
                  {menu.price.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
