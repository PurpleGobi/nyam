'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  variant: 'restaurant' | 'wine'
  autoFocus?: boolean
}

export function SearchBar({ value, onChange, placeholder, variant, autoFocus }: SearchBarProps) {
  const [focused, setFocused] = useState(false)

  const focusRingClass = variant === 'restaurant'
    ? 'border-[var(--accent-food)]'
    : 'border-[var(--accent-wine)]'

  return (
    <div
      className={`mx-4 flex items-center gap-2 rounded-xl border bg-[var(--bg-card)] px-4 py-3 transition-colors ${
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
        onBlur={() => setFocused(false)}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)]"
      />
      {value.length > 0 && (
        <button type="button" onClick={() => onChange('')} className="shrink-0 text-[var(--text-hint)]">
          <X size={16} />
        </button>
      )}
    </div>
  )
}
