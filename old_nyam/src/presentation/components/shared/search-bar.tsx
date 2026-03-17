'use client'

import { Search } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onFocus?: () => void
  className?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder = '검색',
  onFocus,
  className,
}: SearchBarProps) {
  return (
    <div
      className={cn(
        'relative flex items-center bg-neutral-50 rounded-xl border border-neutral-200 transition-all focus-within:border-[#FF6038]/50 focus-within:ring-2 focus-within:ring-[#FF6038]/10',
        className,
      )}
    >
      <Search className="absolute left-4 w-4 h-4 text-neutral-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-[#334E68] placeholder:text-neutral-400 outline-none"
      />
    </div>
  )
}
