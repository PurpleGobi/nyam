'use client'

import { Check } from 'lucide-react'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

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
  accentType?: 'food' | 'wine'
}

export function BubbleFilterChips({ bubbles, selectedId, onSelect, accentType = 'food' }: BubbleFilterChipsProps) {
  if (bubbles.length === 0) return null

  const accentColor = accentType === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'
  const accentLightColor = accentType === 'food' ? 'var(--accent-food-light)' : 'var(--accent-wine-light)'

  return (
    <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
        style={{
          backgroundColor: selectedId === null ? accentLightColor : 'var(--bg-card)',
          color: selectedId === null ? accentColor : 'var(--text-sub)',
          border: selectedId === null ? `1.5px solid ${accentColor}` : '1px solid var(--border)',
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
              backgroundColor: isActive ? accentLightColor : 'var(--bg-card)',
              color: isActive ? accentColor : 'var(--text-sub)',
              border: isActive ? `1.5px solid ${accentColor}` : '1px solid var(--border)',
            }}
          >
            <BubbleIcon icon={b.icon} size={11} />
            {b.name}
            {isActive && <Check size={12} />}
          </button>
        )
      })}
    </div>
  )
}
