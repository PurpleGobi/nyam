'use client'

import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  variant: 'restaurant' | 'wine'
  autoFocus?: boolean
}

export function SearchBar({ value, onChange, placeholder, variant, autoFocus }: SearchBarProps) {
  const focusColor = variant === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div
      className="mx-4 flex items-center gap-2 rounded-xl border bg-[var(--bg-card)] px-4 py-3 transition-colors"
      style={{ borderColor: 'var(--border)', '--focus-color': focusColor } as React.CSSProperties}
      onFocusCapture={(e) => { e.currentTarget.style.borderColor = focusColor }}
      onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <Search size={18} className="shrink-0 text-[var(--text-hint)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
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
