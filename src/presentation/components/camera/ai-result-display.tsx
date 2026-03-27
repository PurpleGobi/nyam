'use client'

import { UtensilsCrossed, MapPin, Sparkles } from 'lucide-react'
import type { RestaurantCandidate } from '@/domain/entities/camera'

interface AIResultDisplayProps {
  candidates: RestaurantCandidate[]
  detectedGenre: string | null
  onSelect: (restaurantId: string) => void
  onSearchFallback: () => void
}

export function AIResultDisplay({
  candidates,
  detectedGenre,
  onSelect,
  onSearchFallback,
}: AIResultDisplayProps) {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-8">
        <p className="text-[15px] text-[var(--text)]">근처에서 식당을 찾지 못했어요</p>
        <button
          type="button"
          onClick={onSearchFallback}
          className="mt-4 rounded-xl bg-[var(--accent-food)] px-6 py-3 text-[14px] font-semibold text-white"
        >
          직접 검색하기
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      {detectedGenre && (
        <div className="mb-3 flex items-center gap-1.5 px-2">
          <Sparkles size={12} className="text-[var(--accent-food)]" />
          <span className="text-[11px] text-[var(--accent-food)]">AI 인식: {detectedGenre}</span>
        </div>
      )}

      <ul className="flex flex-col">
        {candidates.map((candidate) => (
          <li key={candidate.restaurantId}>
            <button
              type="button"
              onClick={() => onSelect(candidate.restaurantId)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-food)_8%,transparent)]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-food)_10%,transparent)]">
                <UtensilsCrossed size={18} className="text-[var(--accent-food)]" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[14px] font-semibold text-[var(--text)]">{candidate.name}</p>
                <p className="truncate text-[12px] text-[var(--text-sub)]">
                  {[candidate.genre, candidate.area].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-[12px] text-[var(--text-hint)]">
                <MapPin size={12} />
                {candidate.distance !== null
                  ? candidate.distance < 1000
                    ? `${Math.round(candidate.distance)}m`
                    : `${(candidate.distance / 1000).toFixed(1)}km`
                  : ''}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
