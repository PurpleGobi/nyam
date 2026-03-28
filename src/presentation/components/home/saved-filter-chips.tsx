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
  const wineClass = accentClass === 'wine' ? 'wine' : ''

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-2" style={{ scrollbarWidth: 'none' }}>
      <button
        type="button"
        onClick={() => onChipSelect(null)}
        className={`filter-chip ${activeChipId === null ? `active ${wineClass}` : ''}`}
      >
        전체
      </button>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onChipSelect(chip.id === activeChipId ? null : chip.id)}
          className={`filter-chip ${activeChipId === chip.id ? `active ${wineClass}` : ''}`}
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
