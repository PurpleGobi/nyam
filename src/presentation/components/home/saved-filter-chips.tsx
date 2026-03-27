'use client'

import type { SavedFilter } from '@/domain/entities/saved-filter'

interface SavedFilterChipsProps {
  chips: SavedFilter[]
  activeChipId: string | null
  counts: Record<string, number>
  accentClass: 'food' | 'wine'
  onChipSelect: (chipId: string | null) => void
}

export function SavedFilterChips({ chips, activeChipId, counts, accentClass, onChipSelect }: SavedFilterChipsProps) {
  const accentColor = accentClass === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
      <button
        type="button"
        onClick={() => onChipSelect(null)}
        className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors"
        style={{
          backgroundColor: activeChipId === null ? accentColor : 'var(--bg-card)',
          color: activeChipId === null ? '#FFFFFF' : 'var(--text-sub)',
          border: `1px solid ${activeChipId === null ? accentColor : 'var(--border)'}`,
        }}
      >
        전체
      </button>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onChipSelect(chip.id === activeChipId ? null : chip.id)}
          className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors"
          style={{
            backgroundColor: activeChipId === chip.id ? accentColor : 'var(--bg-card)',
            color: activeChipId === chip.id ? '#FFFFFF' : 'var(--text-sub)',
            border: `1px solid ${activeChipId === chip.id ? accentColor : 'var(--border)'}`,
          }}
        >
          {chip.name}
          {counts[chip.id] !== undefined && (
            <span className="ml-1 opacity-70">{counts[chip.id]}</span>
          )}
        </button>
      ))}
    </div>
  )
}
