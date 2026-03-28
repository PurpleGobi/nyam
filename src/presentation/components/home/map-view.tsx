'use client'

import { MapPinned } from 'lucide-react'
import { CompactListItem } from '@/presentation/components/home/compact-list-item'
import { MapPin, CurrentLocationDot } from '@/presentation/components/home/map-pin'

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

export function MapView({ records, onPinClick }: MapViewProps) {
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
            지도 영역
          </span>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <CurrentLocationDot />
        </div>

        {records.slice(0, 5).map((record, i) => (
          <button
            key={record.restaurantId}
            type="button"
            onClick={() => onPinClick(record.restaurantId)}
            className="absolute"
            style={{
              top: `${20 + i * 15}%`,
              left: `${15 + i * 16}%`,
            }}
          >
            <MapPin score={record.score} />
          </button>
        ))}
      </div>

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
    </div>
  )
}
