'use client'

import { Search } from 'lucide-react'

interface DiscoverSearchBarProps {
  placeholder?: string
}

export function DiscoverSearchBar({ placeholder = '식당 이름으로 검색' }: DiscoverSearchBarProps) {
  return (
    <div className="mx-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
      <Search size={18} className="shrink-0 text-[var(--text-hint)]" />
      <input
        type="text"
        placeholder={placeholder}
        disabled
        className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)] disabled:opacity-60"
      />
    </div>
  )
}
