'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Clock } from 'lucide-react'
import type { RecentSearch } from '@/domain/entities/search'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  variant: 'restaurant' | 'wine'
  autoFocus?: boolean
  recentSearches?: RecentSearch[]
  onRecentSelect?: (query: string) => void
  onRecentClear?: () => void
}

export function SearchBar({ value, onChange, placeholder, variant, autoFocus, recentSearches, onRecentSelect, onRecentClear }: SearchBarProps) {
  const [focused, setFocused] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const showDropdown = focused && value.length === 0 && (recentSearches?.length ?? 0) > 0

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const focusRingClass = variant === 'restaurant'
    ? 'border-[var(--accent-food)]'
    : 'border-[var(--accent-wine)]'

  return (
    <div ref={wrapperRef} className="relative mx-4">
      <div
        className={`flex items-center gap-2 rounded-xl border bg-[var(--bg-card)] px-4 py-3 transition-colors ${
          focused ? focusRingClass : 'border-[var(--border)]'
        }`}
      >
        <Search size={18} className="shrink-0 text-[var(--text-hint)]" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)]"
        />
        {value.length > 0 && (
          <button type="button" onClick={() => onChange('')} className="shrink-0 text-[var(--text-hint)]">
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-1 shadow-lg">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[12px] text-[var(--text-hint)]">최근 검색</span>
            {onRecentClear && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onRecentClear() }}
                className="text-[11px] text-[var(--text-hint)]"
              >
                전체 삭제
              </button>
            )}
          </div>
          {recentSearches?.map((search) => (
            <button
              key={`${search.query}-${search.timestamp}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onRecentSelect?.(search.query) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--bg-hover)]"
            >
              <Clock size={13} className="shrink-0 text-[var(--text-hint)]" />
              <span className="truncate text-[13px] text-[var(--text)]">{search.query}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
