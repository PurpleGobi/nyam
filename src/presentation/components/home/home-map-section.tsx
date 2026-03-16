'use client'

import { Navigation, Plus, Minus } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

type Filter = 'all' | 'mine' | 'friends'

function normalizePosition(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
): { x: number; y: number } {
  const latRange = bounds.maxLat - bounds.minLat || 0.01
  const lngRange = bounds.maxLng - bounds.minLng || 0.01
  const padding = 0.15
  return {
    x: padding + ((lng - bounds.minLng) / lngRange) * (1 - 2 * padding),
    y: padding + ((bounds.maxLat - lat) / latRange) * (1 - 2 * padding),
  }
}

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
  const allPoints = [
    ...myPins.map((p) => ({ lat: p.lat, lng: p.lng })),
    ...friendPins.map((p) => ({ lat: p.lat, lng: p.lng })),
    ...(myLocation ? [myLocation] : []),
  ]

  const bounds = {
    minLat: Math.min(...allPoints.map((p) => p.lat), 0),
    maxLat: Math.max(...allPoints.map((p) => p.lat), 0),
    minLng: Math.min(...allPoints.map((p) => p.lng), 0),
    maxLng: Math.max(...allPoints.map((p) => p.lng), 0),
  }

  const visibleMyPins = filter === 'friends' ? [] : myPins
  const visibleFriendPins = filter === 'mine' ? [] : friendPins

  const filterOptions: { key: Filter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'mine', label: '내 기록' },
    { key: 'friends', label: '친구' },
  ]

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)]">
      {/* Static map placeholder */}
      <div
        className="relative h-44 w-full overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #EDEAE4 0%, #E3DFD8 100%)',
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(255,255,255,0.3) 24px, rgba(255,255,255,0.3) 25px),
            repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(255,255,255,0.3) 24px, rgba(255,255,255,0.3) 25px),
            linear-gradient(90deg, transparent 45%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.5) 55%, transparent 55%),
            linear-gradient(0deg, transparent 40%, rgba(255,255,255,0.5) 40%, rgba(255,255,255,0.5) 50%, transparent 50%),
            linear-gradient(135deg, #EDEAE4 0%, #E3DFD8 100%)
          `,
        }}
      >
        {/* Heatmap clusters */}
        {visibleMyPins.map((pin) => {
          const pos = normalizePosition(pin.lat, pin.lng, bounds)
          return (
            <div
              key={`heat-${pin.id}`}
              className="pointer-events-none absolute"
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255,96,56,0.25) 0%, transparent 70%)',
              }}
            />
          )
        })}

        {/* My location */}
        {myLocation && (
          <div
            className="absolute"
            style={{
              left: `${normalizePosition(myLocation.lat, myLocation.lng, bounds).x * 100}%`,
              top: `${normalizePosition(myLocation.lat, myLocation.lng, bounds).y * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute h-6 w-6 animate-ping rounded-full bg-[#3B7DD8]/30" />
              <div className="h-3 w-3 rounded-full border-2 border-white bg-[#3B7DD8] shadow-sm" />
            </div>
          </div>
        )}

        {/* Friend pins */}
        {visibleFriendPins.map((pin) => {
          const pos = normalizePosition(pin.lat, pin.lng, bounds)
          return (
            <div
              key={pin.id}
              className="absolute flex flex-col items-center"
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white shadow-sm"
                style={{ backgroundColor: pin.color }}
              >
                {pin.rating}
              </div>
              <span className="mt-0.5 whitespace-nowrap text-[7px] font-medium text-[var(--color-neutral-700)] drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
                {pin.name}
              </span>
            </div>
          )
        })}

        {/* My pins */}
        {visibleMyPins.map((pin) => {
          const pos = normalizePosition(pin.lat, pin.lng, bounds)
          return (
            <div
              key={pin.id}
              className="absolute flex flex-col items-center"
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-500)] text-[9px] font-bold text-white shadow-sm">
                {pin.rating}
              </div>
              <span className="mt-0.5 whitespace-nowrap text-[8px] font-medium text-[var(--color-neutral-700)] drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
                {pin.name}
              </span>
            </div>
          )
        })}

        {/* Zoom controls (non-functional) */}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 shadow-sm backdrop-blur-sm">
            <Plus className="h-3.5 w-3.5 text-[var(--color-neutral-600)]" />
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 shadow-sm backdrop-blur-sm">
            <Minus className="h-3.5 w-3.5 text-[var(--color-neutral-600)]" />
          </div>
        </div>

        {/* Locate button */}
        <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 shadow-sm backdrop-blur-sm">
          <Navigation className="h-3.5 w-3.5 text-[var(--color-neutral-600)]" />
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
