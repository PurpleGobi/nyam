'use client'

import { Check } from 'lucide-react'

interface BubbleChipItem {
  id: string
  name: string
  icon: string | null
  iconBgColor: string | null
}

interface BubbleFilterChipsProps {
  bubbles: BubbleChipItem[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function BubbleFilterChips({ bubbles, selectedId, onSelect }: BubbleFilterChipsProps) {
  if (bubbles.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
        style={{
          backgroundColor: selectedId === null ? 'var(--accent-social)' : 'var(--bg-card)',
          color: selectedId === null ? '#FFFFFF' : 'var(--text-sub)',
          border: selectedId === null ? 'none' : '1px solid var(--border)',
        }}
      >
        전체
      </button>
      {bubbles.map((b) => {
        const isActive = selectedId === b.id
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(isActive ? null : b.id)}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--accent-social)' : 'var(--bg-card)',
              color: isActive ? '#FFFFFF' : 'var(--text-sub)',
              border: isActive ? 'none' : '1px solid var(--border)',
            }}
          >
            <span className="text-[11px]">{b.icon ?? '🫧'}</span>
            {b.name}
            {isActive && <Check size={12} />}
          </button>
        )
      })}
    </div>
  )
}
