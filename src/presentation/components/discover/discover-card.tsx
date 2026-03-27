'use client'

import { useRouter } from 'next/navigation'
import { Star, Award, UtensilsCrossed } from 'lucide-react'
import type { DiscoverCard as CardType } from '@/domain/entities/discover'

interface DiscoverCardProps {
  card: CardType
}

export function DiscoverCard({ card }: DiscoverCardProps) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(`/restaurants/${card.id}`)}
      className="flex w-full overflow-hidden rounded-xl text-left"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="h-[140px] w-[140px] shrink-0" style={{ backgroundColor: 'var(--bg)' }}>
        {card.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UtensilsCrossed size={32} style={{ color: 'var(--text-hint)' }} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <p className="text-[15px] font-semibold text-[var(--text)]">{card.name}</p>
          <p className="mt-0.5 text-[12px] text-[var(--text-sub)]">
            {[card.genre, card.area].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {card.michelinStars && (
            <span className="flex items-center gap-0.5 text-[11px]" style={{ color: '#C9A96E' }}>
              <Star size={10} /> {card.michelinStars}스타
            </span>
          )}
          {card.hasBlueRibbon && (
            <span className="flex items-center gap-0.5 text-[11px]" style={{ color: '#2563EB' }}>
              <Award size={10} /> 블루리본
            </span>
          )}
          {card.nyamScore && (
            <span className="text-[12px] font-bold" style={{ color: 'var(--accent-food)' }}>
              {Math.round(card.nyamScore)}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
