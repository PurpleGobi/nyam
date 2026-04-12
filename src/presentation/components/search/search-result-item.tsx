'use client'

import { UtensilsCrossed, Wine, MapPin, Heart } from 'lucide-react'
import type { SearchResult } from '@/domain/entities/search'
import { PrestigeBadges } from '@/presentation/components/ui/prestige-badges'
import type { RestaurantPrestige } from '@/domain/entities/restaurant'

interface SearchResultItemProps {
  result: SearchResult
  onSelect: (result: SearchResult) => void
  prestige?: RestaurantPrestige[]
  isSelected?: boolean
  /** 찜 상태 */
  isBookmarked?: boolean
  /** 찜 토글 */
  onBookmarkToggle?: () => void
}

export function SearchResultItem({ result, onSelect, prestige, isSelected, isBookmarked, onBookmarkToggle }: SearchResultItemProps) {
  const isRestaurant = result.type === 'restaurant'
  const accentClass = isRestaurant ? 'text-[var(--accent-food)]' : 'text-[var(--accent-wine)]'
  const bgClass = isRestaurant
    ? 'bg-[var(--accent-food-light)]'
    : 'bg-[var(--accent-wine-light)]'

  const displayName =
    result.type === 'wine' && result.vintage
      ? `${result.name} ${result.vintage}`
      : result.name

  const wineTypeMap: Record<string, string> = {
    red: 'Red', white: 'White', rose: 'Rosé',
    sparkling: 'Sparkling', orange: 'Orange',
    fortified: 'Fortified', dessert: 'Dessert',
  }

  const subtitle =
    result.type === 'restaurant'
      ? [result.genreDisplay, result.area].filter(Boolean).join(' · ')
      : [
          result.wineType ? (wineTypeMap[result.wineType] ?? result.wineType) : null,
          result.country,
          result.region,
        ].filter(Boolean).join(' · ')

  const distance = result.type === 'restaurant' ? result.distance : null

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className={`flex w-full items-center gap-3 px-4 py-3 transition-colors ${isRestaurant ? 'hover:bg-[var(--accent-food-light)]' : 'hover:bg-[var(--accent-wine-light)]'} ${isSelected ? (isRestaurant ? 'bg-[var(--accent-food-light)]' : 'bg-[var(--accent-wine-light)]') : ''}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bgClass}`}>
        {isRestaurant ? (
          <UtensilsCrossed size={18} className={accentClass} />
        ) : (
          <Wine size={18} className={accentClass} />
        )}
      </div>

      <div className="min-w-0 flex-1 text-left">
        <p className="flex items-center gap-1 truncate text-[14px] font-semibold text-[var(--text)]">
          <span className="truncate">{displayName}</span>
          {prestige && prestige.length > 0 && <PrestigeBadges prestige={prestige} />}
        </p>
        {subtitle && <p className="truncate text-[12px] text-[var(--text-sub)]">{subtitle}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {result.hasRecord && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              isRestaurant
                ? 'bg-[var(--accent-food-light)] text-[var(--accent-food)]'
                : 'bg-[var(--accent-wine-light)] text-[var(--accent-wine)]'
            }`}
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

      {/* 찜 Heart */}
      {onBookmarkToggle && (
        <div
          role="button"
          tabIndex={0}
          className="flex shrink-0 cursor-pointer items-center justify-center pl-1"
          onClick={(e) => { e.stopPropagation(); onBookmarkToggle() }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onBookmarkToggle() } }}
        >
          <Heart
            size={16}
            style={{ color: isBookmarked ? '#FF6038' : 'var(--text-hint)' }}
            fill={isBookmarked ? '#FF6038' : 'transparent'}
          />
        </div>
      )}
    </button>
  )
}
