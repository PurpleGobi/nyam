'use client'

import { Check } from 'lucide-react'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { FilterChipGroup } from '@/presentation/components/ui/filter-chip'

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
    <FilterChipGroup className="py-1">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`filter-chip ${selectedId === null ? 'active social' : ''}`}
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
            className="filter-chip"
            style={isActive ? {
              backgroundColor: b.iconBgColor ?? 'var(--accent-social)',
              borderColor: b.iconBgColor ?? 'var(--accent-social)',
              color: '#FFFFFF',
            } : undefined}
          >
            <BubbleIcon icon={b.icon} size={11} />
            {b.name}
            {isActive && <Check size={12} />}
          </button>
        )
      })}
    </FilterChipGroup>
  )
}
