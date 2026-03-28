'use client'

import { useRef, useState, useEffect } from 'react'
import type { SavedFilter } from '@/domain/entities/saved-filter'
import { InlinePager } from '@/presentation/components/home/inline-pager'
import { FilterChipGroup } from '@/presentation/components/ui/filter-chip'

interface SavedFilterChipsProps {
  chips: SavedFilter[]
  activeChipId: string | null
  counts: Record<string, number>
  accentClass: 'food' | 'wine'
  onChipSelect: (chipId: string | null) => void
  recordPage?: number
  recordTotalPages?: number
  onRecordPagePrev?: () => void
  onRecordPageNext?: () => void
}

export function SavedFilterChips({ chips, activeChipId, counts, accentClass, onChipSelect, recordPage, recordTotalPages, onRecordPagePrev, onRecordPageNext }: SavedFilterChipsProps) {
  const wineClass = accentClass === 'wine' ? 'wine' : ''
  const scrollRef = useRef<HTMLDivElement>(null)
  const [needsPager, setNeedsPager] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const hasOverflow = el.scrollWidth > el.clientWidth
    setNeedsPager(hasOverflow)
    if (hasOverflow) {
      setTotalPages(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth)))
    }
  }, [chips])

  const handlePrev = () => {
    const el = scrollRef.current
    if (!el) return
    const pageWidth = el.clientWidth
    el.scrollBy({ left: -pageWidth, behavior: 'smooth' })
    setCurrentPage((p) => Math.max(1, p - 1))
  }

  const handleNext = () => {
    const el = scrollRef.current
    if (!el) return
    const pageWidth = el.clientWidth
    el.scrollBy({ left: pageWidth, behavior: 'smooth' })
    setCurrentPage((p) => Math.min(totalPages, p + 1))
  }

  const showRecordPager = recordTotalPages != null && recordTotalPages > 1

  return (
    <div className="flex items-center px-4 py-2" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="relative min-w-0 flex-1">
        <FilterChipGroup ref={scrollRef} className="min-w-0 flex-1" style={showRecordPager ? { maskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent)', WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent)' } : undefined}>
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
                <span className="filter-chip-count">{counts[chip.id]}</span>
              )}
            </button>
          ))}
        </FilterChipGroup>
      </div>
      {showRecordPager && onRecordPagePrev && onRecordPageNext && (
        <InlinePager
          currentPage={recordPage ?? 1}
          totalPages={recordTotalPages ?? 1}
          onPrev={onRecordPagePrev}
          onNext={onRecordPageNext}
        />
      )}
    </div>
  )
}
