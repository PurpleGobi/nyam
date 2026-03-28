'use client'

import Image from 'next/image'
import { UtensilsCrossed, Wine } from 'lucide-react'
import { getGaugeColor } from '@/shared/utils/gauge-color'

interface PickItem {
  id: string
  name: string
  targetType: 'restaurant' | 'wine'
  satisfaction: number | null
  thumbnailUrl: string | null
  genre: string | null
}

interface PicksGridProps {
  picks: PickItem[]
  onItemPress: (id: string, targetType: 'restaurant' | 'wine') => void
}

export function PicksGrid({ picks, onItemPress }: PicksGridProps) {
  if (picks.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-[13px]" style={{ color: 'var(--text-hint)' }}>아직 기록이 없어요</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>Top Picks</h3>
      <div className="grid grid-cols-2 gap-2">
        {picks.slice(0, 6).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemPress(item.id, item.targetType)}
            className="flex flex-col overflow-hidden rounded-xl transition-transform active:scale-[0.97]"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div
              className="relative flex h-24 items-center justify-center"
              style={{
                backgroundColor: item.targetType === 'restaurant' ? 'var(--accent-food-light)' : 'var(--accent-wine-light)',
              }}
            >
              {item.thumbnailUrl ? (
                <Image src={item.thumbnailUrl} alt="" fill className="object-cover" sizes="50vw" unoptimized />
              ) : item.targetType === 'restaurant' ? (
                <UtensilsCrossed size={24} style={{ color: 'var(--text-hint)' }} />
              ) : (
                <Wine size={24} style={{ color: 'var(--text-hint)' }} />
              )}
            </div>
            <div className="flex items-center justify-between px-2.5 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{item.name}</p>
                {item.genre && (
                  <p className="truncate text-[10px]" style={{ color: 'var(--text-hint)' }}>{item.genre}</p>
                )}
              </div>
              {item.satisfaction !== null && (
                <div
                  className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: getGaugeColor(item.satisfaction) }}
                >
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#FFFFFF' }}>{item.satisfaction}</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
