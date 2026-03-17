'use client'

import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface KakaoPlaceResult {
  externalId: string
  name: string
  address: string
  phone: string | null
  lat: number
  lng: number
  externalUrl: string
  categoryName: string
}

interface RestaurantMatcherProps {
  query: string
  onQueryChange: (q: string) => void
  results: KakaoPlaceResult[]
  isSearching: boolean
  selected: KakaoPlaceResult | null
  onSelect: (place: KakaoPlaceResult) => void
  onClear: () => void
}

export function RestaurantMatcher({
  query,
  onQueryChange,
  results,
  isSearching,
  selected,
  onSelect,
  onClear,
}: RestaurantMatcherProps) {
  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#FF6038]/30 bg-[#FF6038]/5">
        <div className="min-w-0">
          <p className="font-medium text-sm text-neutral-800 truncate">
            {selected.name}
          </p>
          <p className="text-xs text-neutral-500 truncate">
            {selected.address}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 size-6 flex items-center justify-center rounded-full bg-neutral-200 text-neutral-500 hover:bg-neutral-300 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="식당 이름으로 검색"
          className={cn(
            'w-full pl-9 pr-9 py-2.5 rounded-lg border border-neutral-200 text-sm',
            'placeholder:text-neutral-400 focus:outline-none focus:border-[#FF6038] transition-colors',
          )}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400 animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <ul className="rounded-lg border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100">
          {results.map((place) => (
            <li key={place.externalId}>
              <button
                type="button"
                onClick={() => onSelect(place)}
                className="w-full text-left px-3 py-2.5 hover:bg-neutral-50 transition-colors"
              >
                <p className="font-medium text-sm text-neutral-800">
                  {place.name}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {place.address}
                </p>
                {place.categoryName && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {place.categoryName}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
