'use client'

import { Search, X } from 'lucide-react'

interface SearchDropdownProps {
  query: string
  onQueryChange: (query: string) => void
  onClear: () => void
  placeholder?: string
}

export function SearchDropdown({ query, onQueryChange, onClear, placeholder = '식당·와인 이름으로 검색' }: SearchDropdownProps) {
  return (
    <div className="ds-search-dropdown mx-4 flex items-center gap-2.5">
      <Search size={16} className="shrink-0" style={{ color: 'var(--text-hint)' }} />

      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
        style={{ color: 'var(--text)' }}
      />

      {query.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: 'var(--bg)', color: 'var(--text-hint)' }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
