'use client'

import { useRef, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface SearchDropdownProps {
  query: string
  onQueryChange: (query: string) => void
  onClear: () => void
  placeholder?: string
  autoFocus?: boolean
}

export function SearchDropdown({
  query,
  onQueryChange,
  onClear,
  placeholder = '검색',
  autoFocus = true,
}: SearchDropdownProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onQueryChange(e.target.value)
  }, [onQueryChange])

  return (
    <div className="ds-search-dropdown">
      <Search size={15} className="shrink-0" style={{ color: 'var(--text-hint)' }} />

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="ds-search-dropdown-input"
      />

      {query.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="ds-search-dropdown-clear"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
