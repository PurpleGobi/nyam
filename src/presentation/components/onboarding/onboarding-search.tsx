'use client'

import { Search, X } from 'lucide-react'

interface OnboardingSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function OnboardingSearch({ value, onChange, placeholder = '식당 검색' }: OnboardingSearchProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <Search size={16} style={{ color: 'var(--text-hint)' }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--text-hint)]"
        style={{ color: 'var(--text)' }}
      />
      {value.length > 0 && (
        <button type="button" onClick={() => onChange('')}>
          <X size={14} style={{ color: 'var(--text-hint)' }} />
        </button>
      )}
    </div>
  )
}
