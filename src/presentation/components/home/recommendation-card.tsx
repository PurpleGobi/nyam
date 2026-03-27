'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, UtensilsCrossed, Wine } from 'lucide-react'
import type { RecommendationCard as CardType } from '@/domain/entities/recommendation'

interface RecommendationCardProps {
  card: CardType
}

export function RecommendationCard({ card }: RecommendationCardProps) {
  const router = useRouter()
  const prefix = card.targetType === 'restaurant' ? 'restaurants' : 'wines'

  return (
    <button
      type="button"
      onClick={() => router.push(`/${prefix}/${card.targetId}`)}
      className="flex shrink-0 flex-col overflow-hidden rounded-xl"
      style={{ width: '160px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="relative h-24 w-full" style={{ backgroundColor: 'var(--bg)' }}>
        {card.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {card.targetType === 'restaurant' ? (
              <UtensilsCrossed size={24} style={{ color: 'var(--text-hint)' }} />
            ) : (
              <Wine size={24} style={{ color: 'var(--text-hint)' }} />
            )}
          </div>
        )}
        <span
          className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{ fontSize: '9px', fontWeight: 600, backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFFFFF' }}
        >
          <Sparkles size={8} /> AI
        </span>
      </div>
      <div className="p-2.5">
        <p className="truncate text-[13px] font-semibold text-[var(--text)]">{card.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-sub)]">{card.meta}</p>
        <p className="mt-1 text-[10px] text-[var(--text-hint)]">{card.reason}</p>
      </div>
    </button>
  )
}
