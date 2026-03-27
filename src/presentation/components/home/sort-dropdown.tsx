'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUpDown, Check } from 'lucide-react'

export type SortOption = 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count'

interface SortDropdownProps {
  currentSort: SortOption
  onSortChange: (sort: SortOption) => void
  accentType: 'food' | 'wine'
}

const SORT_LABELS: Record<SortOption, string> = {
  latest: '최신순',
  score_high: '평점 높은순',
  score_low: '평점 낮은순',
  name: '이름순',
  visit_count: '방문 많은순',
}

export function SortDropdown({ currentSort, onSortChange, accentType }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const accentColor = accentType === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (sort: SortOption) => {
    onSortChange(sort)
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
        style={{
          color: 'var(--text-sub)',
          backgroundColor: isOpen ? 'var(--bg-card)' : 'transparent',
        }}
      >
        <ArrowUpDown size={14} />
        {SORT_LABELS[currentSort]}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl py-1"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] transition-colors"
              style={{
                color: currentSort === key ? accentColor : 'var(--text)',
              }}
            >
              {SORT_LABELS[key]}
              {currentSort === key && <Check size={14} style={{ color: accentColor }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
