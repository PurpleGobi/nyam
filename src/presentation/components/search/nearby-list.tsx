'use client'

import { MapPin, UtensilsCrossed } from 'lucide-react'
import type { NearbyRestaurant } from '@/domain/entities/search'

interface NearbyListProps {
  restaurants: NearbyRestaurant[]
  isLoading: boolean
  onSelect: (restaurantId: string) => void
  onRegister?: () => void
}

export function NearbyList({ restaurants, isLoading, onSelect, onRegister }: NearbyListProps) {
  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <MapPin size={14} className="text-[var(--text-sub)]" />
        <span className="text-[14px] text-[var(--text-sub)]">근처 식당</span>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 rounded-lg px-3 py-3">
              <div className="h-9 w-9 rounded-lg bg-[var(--border)]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 rounded bg-[var(--border)]" />
                <div className="h-3 w-20 rounded bg-[var(--border)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && restaurants.length === 0 && (
        <p className="py-6 text-center text-[13px] text-[var(--text-hint)]">
          근처에 등록된 식당이 없습니다
        </p>
      )}

      {!isLoading && restaurants.length > 0 && (
        <ul className="flex flex-col">
          {restaurants.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-food)_8%,transparent)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-food)_10%,transparent)]">
                  <UtensilsCrossed size={18} className="text-[var(--accent-food)]" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[14px] font-semibold text-[var(--text)]">{r.name}</p>
                  <p className="truncate text-[12px] text-[var(--text-sub)]">
                    {[r.genre, r.area].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.hasRecord && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--accent-food) 15%, transparent)',
                        color: 'var(--accent-food)',
                      }}
                    >
                      기록 있음
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 text-[12px] text-[var(--text-hint)]">
                    <MapPin size={12} />
                    {r.distance < 1000 ? `${Math.round(r.distance)}m` : `${(r.distance / 1000).toFixed(1)}km`}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && onRegister && (
        <button
          type="button"
          onClick={onRegister}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--border)] px-4 py-3 text-[13px] text-[var(--text-hint)]"
        >
          ⊕ 목록에 없나요? 직접 등록하기
        </button>
      )}
    </div>
  )
}
