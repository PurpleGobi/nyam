'use client'

import { Clock, X } from 'lucide-react'
import type { RecentSearch } from '@/domain/entities/search'

interface RecentSearchesProps {
  searches: RecentSearch[]
  onSelect: (query: string) => void
  onClear: () => void
}

export function RecentSearches({ searches, onSelect, onClear }: RecentSearchesProps) {
  if (searches.length === 0) return null

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[14px] text-[var(--text-sub)]">최근 검색</span>
        <button
          type="button"
          onClick={onClear}
          className="text-[12px] text-[var(--text-hint)]"
        >
          전체 삭제
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {searches.map((search) => (
          <button
            key={`${search.query}-${search.timestamp}`}
            type="button"
            onClick={() => onSelect(search.query)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5"
          >
            <Clock size={12} className="text-[var(--text-hint)]" />
            <span className="text-[13px] text-[var(--text)]">{search.query}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
