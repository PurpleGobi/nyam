'use client'

import { Plus, Search } from 'lucide-react'
import type { SearchResult, SearchScreenState } from '@/domain/entities/search'
import { SearchResultItem } from '@/presentation/components/search/search-result-item'

interface SearchResultsProps {
  screenState: SearchScreenState
  results: SearchResult[]
  variant: 'restaurant' | 'wine'
  onSelect: (result: SearchResult) => void
  onRegister: () => void
}

export function SearchResults({ screenState, results, variant, onSelect, onRegister }: SearchResultsProps) {
  if (screenState === 'searching') {
    return (
      <div className="flex flex-col items-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--text-hint)] border-t-transparent" />
        <p className="mt-3 text-[13px] text-[var(--text-hint)]">검색 중...</p>
      </div>
    )
  }

  if (screenState === 'empty') {
    return (
      <div className="flex flex-col items-center py-12">
        <Search size={32} className="mb-3 text-[var(--text-hint)]" />
        <p className="mt-3 text-[14px] text-[var(--text-sub)]">검색 결과가 없습니다</p>
        <button
          type="button"
          onClick={onRegister}
          className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-[var(--border-bold)] px-4 py-2.5 text-[13px] text-[var(--text-sub)]"
        >
          <Plus size={16} />
          목록에 없나요? 직접 등록하기
        </button>
      </div>
    )
  }

  if (screenState === 'results' && results.length > 0) {
    return (
      <div>
        <ul className="divide-y divide-[var(--border)]">
          {results.map((result) => (
            <li key={result.id}>
              <SearchResultItem result={result} onSelect={onSelect} />
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onRegister}
            className="flex w-full items-center gap-2 px-4 py-3.5 text-[13px] text-[var(--text-sub)]"
          >
            <Plus size={16} />
            목록에 없나요? 직접 등록하기
          </button>
        </div>
      </div>
    )
  }

  return null
}
