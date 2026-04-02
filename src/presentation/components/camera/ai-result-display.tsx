'use client'

import { useState, useRef, useEffect } from 'react'
import { UtensilsCrossed, MapPin, Search, X } from 'lucide-react'
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
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = query.trim()
    ? candidates.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.genre ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (c.area ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : candidates

  return (
    <div className="px-4 py-4">
      {/* 검색창 */}
      <div
        className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <Search size={16} style={{ color: 'var(--text-hint)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="식당 이름으로 검색"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'none',
            fontSize: '14px',
            color: 'var(--text)',
            outline: 'none',
          }}
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{ color: 'var(--text-hint)', flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 근처 식당 라벨 */}
      <p className="mb-1 px-2 text-[11px] font-medium" style={{ color: 'var(--text-hint)' }}>
        {query.trim() ? `"${query}" 검색 결과` : '사진 위치 근처 식당'}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-8">
          <p className="text-[15px]" style={{ color: 'var(--text)' }}>
            {candidates.length === 0 ? '근처에서 식당을 찾지 못했어요' : '검색 결과가 없어요'}
          </p>
          <button
            type="button"
            onClick={onSearchFallback}
            className="mt-4 rounded-xl px-6 py-3 text-[14px] font-semibold text-white"
            style={{ backgroundColor: 'var(--accent-food)' }}
          >
            직접 검색하기
          </button>
        </div>
      ) : (
        <ul className="flex flex-col">
          {filtered.map((candidate) => (
            <li key={candidate.restaurantId}>
              <button
                type="button"
                onClick={() => onSelect(candidate.restaurantId)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 transition-colors hover:bg-[var(--accent-food-light)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--accent-food-light)' }}>
                  <UtensilsCrossed size={18} style={{ color: 'var(--accent-food)' }} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{candidate.name}</p>
                  <p className="truncate text-[12px]" style={{ color: 'var(--text-sub)' }}>
                    {[candidate.genre, candidate.area].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-[12px]" style={{ color: 'var(--text-hint)' }}>
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
      )}

      {/* 하단 직접 검색 링크 */}
      {filtered.length > 0 && (
        <button
          type="button"
          onClick={onSearchFallback}
          className="mt-2 w-full py-3 text-center text-[13px] font-medium"
          style={{ color: 'var(--accent-food)' }}
        >
          목록에 없나요? 직접 검색하기
        </button>
      )}
    </div>
  )
}
