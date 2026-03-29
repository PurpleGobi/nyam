'use client'

import Image from 'next/image'
import { Star, UtensilsCrossed, Wine } from 'lucide-react'
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
  title?: string
  onItemPress: (id: string, targetType: 'restaurant' | 'wine') => void
}

export function PicksGrid({ picks, title, onItemPress }: PicksGridProps) {
  if (picks.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-[13px]" style={{ color: 'var(--text-hint)' }}>아직 기록이 없어요</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3" style={{ padding: '16px 20px' }}>
      <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: 'var(--text)' }}>
        <Star size={14} style={{ color: 'var(--text-sub)' }} />
        {title ?? '강력 추천'}
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {picks.slice(0, 6).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemPress(item.id, item.targetType)}
            className="flex w-[82px] shrink-0 flex-col overflow-hidden transition-transform active:scale-[0.96]"
          >
            <div
              className="relative flex items-center justify-center rounded-xl"
              style={{
                width: '82px',
                height: '82px',
                backgroundColor: item.targetType === 'restaurant' ? 'var(--accent-food-light)' : 'var(--accent-wine-light)',
              }}
            >
              {item.thumbnailUrl ? (
                <>
                  <Image src={item.thumbnailUrl} alt="" fill className="rounded-xl object-cover" sizes="82px" />
                  <div className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
                </>
              ) : item.targetType === 'restaurant' ? (
                <UtensilsCrossed size={24} style={{ color: 'var(--text-hint)' }} />
              ) : (
                <Wine size={24} style={{ color: 'var(--text-hint)' }} />
              )}
              {item.satisfaction !== null && (
                <span className="absolute bottom-[5px] right-[5px] text-[11px] font-extrabold" style={{ color: '#FFFFFF' }}>
                  {item.satisfaction}
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-[11px] font-semibold" style={{ color: 'var(--text)' }}>{item.name}</p>
            {item.genre && (
              <p className="truncate text-[10px]" style={{ color: 'var(--text-hint)' }}>{item.genre}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
