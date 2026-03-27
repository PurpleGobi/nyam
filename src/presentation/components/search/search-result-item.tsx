'use client'

import { UtensilsCrossed, Wine, MapPin } from 'lucide-react'
import type { SearchResult } from '@/domain/entities/search'

interface SearchResultItemProps {
  result: SearchResult
  onSelect: (result: SearchResult) => void
}

export function SearchResultItem({ result, onSelect }: SearchResultItemProps) {
  const isRestaurant = result.type === 'restaurant'
  const accentClass = isRestaurant ? 'text-[var(--accent-food)]' : 'text-[var(--accent-wine)]'
  const bgClass = isRestaurant
    ? 'bg-[color-mix(in_srgb,var(--accent-food)_10%,transparent)]'
    : 'bg-[color-mix(in_srgb,var(--accent-wine)_10%,transparent)]'

  const subtitle =
    result.type === 'restaurant'
      ? [result.genre, result.area].filter(Boolean).join(' · ')
      : [result.wineType, result.region, result.vintage].filter(Boolean).join(' · ')

  const distance = result.type === 'restaurant' ? result.distance : null

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--border)_30%,transparent)]"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bgClass}`}>
        {isRestaurant ? (
          <UtensilsCrossed size={18} className={accentClass} />
        ) : (
          <Wine size={18} className={accentClass} />
        )}
      </div>

      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[14px] font-semibold text-[var(--text)]">{result.name}</p>
        {subtitle && <p className="truncate text-[12px] text-[var(--text-sub)]">{subtitle}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {result.hasRecord && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{
              backgroundColor: isRestaurant
                ? 'color-mix(in srgb, var(--accent-food) 15%, transparent)'
                : 'color-mix(in srgb, var(--accent-wine) 15%, transparent)',
              color: isRestaurant ? 'var(--accent-food)' : 'var(--accent-wine)',
            }}
          >
            기록 있음
          </span>
        )}
        {distance !== null && (
          <span className="flex items-center gap-0.5 text-[12px] text-[var(--text-hint)]">
            <MapPin size={12} />
            {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}
          </span>
        )}
      </div>
    </button>
  )
}
