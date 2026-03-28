'use client'

import { useRouter } from 'next/navigation'
import { UtensilsCrossed, Wine, Heart, MessageCircle } from 'lucide-react'
import type { RecommendationCard as CardType } from '@/domain/entities/recommendation'
import { RecommendationSourceTag } from '@/presentation/components/home/recommendation-source-tag'

interface RecommendationCardProps {
  card: CardType
  onClick?: () => void
}

export function RecommendationCard({ card, onClick }: RecommendationCardProps) {
  const router = useRouter()
  const prefix = card.targetType === 'restaurant' ? 'restaurants' : 'wines'

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push(`/${prefix}/${card.targetId}?from=recommend`)
    }
  }

  // 재방문 추천은 accent, 미방문은 hint (RECOMMENDATION.md §2)
  const isRevisit = card.algorithm === 'revisit'
  const scoreColor = isRevisit ? 'var(--accent-food)' : 'var(--text-hint)'

  return (
    <button
      type="button"
      onClick={handleClick}
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
        <span className="absolute left-2 top-2">
          <RecommendationSourceTag source={card.source} />
        </span>
      </div>
      <div className="p-2.5">
        <p className="truncate text-[13px] font-semibold text-[var(--text)]">{card.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-sub)]">{card.meta}</p>
        {card.normalizedScore > 0 && (
          <p className="mt-0.5 text-[11px] font-semibold" style={{ color: scoreColor }}>
            {Math.round(card.normalizedScore)}
          </p>
        )}
        <p className="mt-1 text-[10px] text-[var(--text-hint)]">{card.reason}</p>
        {(card.likeCount > 0 || card.commentCount > 0) && (
          <div className="mt-1 flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-hint)' }}>
            {card.likeCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Heart size={10} /> {card.likeCount}
              </span>
            )}
            {card.commentCount > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageCircle size={10} /> {card.commentCount}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
