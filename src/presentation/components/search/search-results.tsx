'use client'

import { Search } from 'lucide-react'
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
      <div className="flex items-center justify-center py-12">
        <div
          className="h-6 w-6 animate-spin rounded-full border-[3px] border-t-transparent"
          style={{
            borderColor: variant === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)',
            borderTopColor: 'transparent',
          }}
        />
      </div>
    )
  }

  if (screenState === 'empty') {
    return (
      <div className="flex flex-col items-center py-12">
        <Search size={32} className="text-[var(--text-hint)]" />
        <p className="mt-3 text-[14px] text-[var(--text-sub)]">검색 결과가 없습니다</p>
        <button
          type="button"
          onClick={onRegister}
          className="mt-4 rounded-xl border-2 border-dashed border-[var(--border)] px-5 py-2.5 text-[14px] font-medium text-[var(--text)]"
        >
          직접 등록하기
        </button>
      </div>
    )
  }

  if (screenState === 'results' && results.length > 0) {
    return (
      <div className="divide-y divide-[var(--border)]">
        {results.map((result) => (
          <SearchResultItem key={result.id} result={result} onSelect={onSelect} />
        ))}
      </div>
    )
  }

  return null
}
