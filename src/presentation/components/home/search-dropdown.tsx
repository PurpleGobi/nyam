'use client'

import { useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface SearchDropdownProps {
  query: string
  onQueryChange: (query: string) => void
  onClear: () => void
  placeholder?: string
}

export function SearchDropdown({ query, onQueryChange, onClear, placeholder = '식당·와인 이름으로 검색' }: SearchDropdownProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onQueryChange(e.target.value)
    // auto-expand
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [onQueryChange])

  return (
    <div
      style={{
        padding: '8px 16px',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '8px 12px',
        }}
      >
        <Search size={16} className="shrink-0" style={{ color: 'var(--text-hint)' }} />

        <textarea
          ref={textareaRef}
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          rows={1}
          style={{
            flex: 1,
            border: 'none',
            background: 'none',
            fontSize: '14px',
            color: 'var(--text)',
            resize: 'none',
            outline: 'none',
            lineHeight: '1.4',
            overflow: 'hidden',
          }}
        />

        {query.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex shrink-0 items-center justify-center rounded-full"
            style={{ width: '20px', height: '20px', backgroundColor: 'var(--bg)', color: 'var(--text-hint)' }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
