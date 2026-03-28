'use client'

import { useRef, useState, useEffect } from 'react'
import type { SavedFilter } from '@/domain/entities/saved-filter'
import { InlinePager } from '@/presentation/components/home/inline-pager'

interface SavedFilterChipsProps {
  chips: SavedFilter[]
  activeChipId: string | null
  counts: Record<string, number>
  accentClass: 'food' | 'wine'
  onChipSelect: (chipId: string | null) => void
}

export function SavedFilterChips({ chips, activeChipId, counts, accentClass, onChipSelect }: SavedFilterChipsProps) {
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

  return (
    <div className="flex items-center px-4 pb-2 pt-2">
      <div ref={scrollRef} className="flex min-w-0 flex-1 gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
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
      {needsPager && (
        <InlinePager
          currentPage={currentPage}
          totalPages={totalPages}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  )
}
