'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { UtensilsCrossed } from 'lucide-react'
import type { DiscoverCard as CardType } from '@/domain/entities/discover'

interface DiscoverCardProps {
  card: CardType
}

export function DiscoverCard({ card }: DiscoverCardProps) {
  const router = useRouter()

  const meta = [card.genre, card.area, card.specialty].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={() => router.push(`/restaurants/${card.id}`)}
      className="flex w-full flex-col overflow-hidden rounded-2xl text-left transition-transform active:scale-[0.98]"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Photo */}
      <div className="relative h-[140px] w-full" style={{ backgroundColor: 'var(--bg)' }}>
        {card.photoUrl ? (
          <Image src={card.photoUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UtensilsCrossed size={32} style={{ color: 'var(--text-hint)' }} />
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-[10px] top-[10px] flex gap-[6px]">
          {card.michelinStars && (
            <span
              className="text-[11px] font-bold text-white"
              style={{
                padding: '4px 9px',
                borderRadius: 100,
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                backdropFilter: 'blur(8px)',
              }}
            >
              미슐랭 {'★'.repeat(card.michelinStars)}
            </span>
          )}
          {card.hasBlueRibbon && (
            <span
              className="text-[11px] font-bold text-white"
              style={{
                padding: '4px 9px',
                borderRadius: 100,
                backgroundColor: 'rgba(59, 130, 246, 0.9)',
                backdropFilter: 'blur(8px)',
              }}
            >
              블루리본
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <p className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>{card.name}</p>
          {card.nyamScore != null && (
            <span className="text-[16px] font-extrabold" style={{ color: 'var(--accent-food)' }}>
              {Math.round(card.nyamScore)}
            </span>
          )}
        </div>

        {/* Meta */}
        {meta && (
          <p className="mt-[2px] text-[13px]" style={{ color: 'var(--text-sub)' }}>{meta}</p>
        )}

        {/* External score pills */}
        <ExternalScorePills
          naverRating={card.naverRating}
          kakaoRating={card.kakaoRating}
          googleRating={card.googleRating}
        />
      </div>
    </button>
  )
}

function ExternalScorePills({
  naverRating,
  kakaoRating,
  googleRating,
}: {
  naverRating: number | null
  kakaoRating: number | null
  googleRating: number | null
}) {
  const pills: { label: string; value: number }[] = []
  if (naverRating != null) pills.push({ label: 'N', value: naverRating })
  if (kakaoRating != null) pills.push({ label: 'K', value: kakaoRating })
  if (googleRating != null) pills.push({ label: 'G', value: googleRating })

  if (pills.length === 0) return null

  return (
    <div className="mt-[8px] flex gap-[8px]">
      {pills.map((pill) => (
        <span
          key={pill.label}
          className="text-[12px] font-semibold"
          style={{
            color: 'var(--text-sub)',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            padding: '3px 8px',
            borderRadius: 6,
          }}
        >
          {pill.label} {pill.value.toFixed(1)}
        </span>
      ))}
    </div>
  )
}
