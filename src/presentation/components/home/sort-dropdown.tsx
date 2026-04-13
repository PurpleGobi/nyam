'use client'

import { useRef, useEffect } from 'react'
import { Check } from 'lucide-react'
import type { SortOption } from '@/domain/entities/saved-filter'

interface SortDropdownProps<T extends string = SortOption> {
  currentSort: T
  onSortChange: (sort: T) => void
  accentType: 'food' | 'wine' | 'social'
  labels?: Partial<Record<T, string>>
  onClose?: () => void
}

const DEFAULT_SORT_LABELS: Record<SortOption, string> = {
  latest: '최신순',
  score_high: '점수 높은순',
  score_low: '점수 낮은순',
  name: '이름순',
  visit_count: '방문 많은순',
  distance: '거리순',
}

const ACCENT_MAP = {
  food: 'var(--accent-food)',
  wine: 'var(--accent-wine)',
  social: 'var(--accent-social)',
}

export function SortDropdown<T extends string = SortOption>({
  currentSort,
  onSortChange,
  accentType,
  labels,
  onClose,
}: SortDropdownProps<T>) {
  const accentColor = ACCENT_MAP[accentType]
  const sortLabels = (labels ?? DEFAULT_SORT_LABELS) as Record<T, string>
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onClose) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div ref={dropdownRef} className="ds-sort-dropdown mx-4 py-1">
      {(Object.keys(sortLabels) as T[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onSortChange(key)}
          className={`nyam-dropdown-item w-full justify-between ${currentSort === key ? 'selected' : ''}`}
          style={{
            color: currentSort === key ? accentColor : undefined,
          }}
        >
          {sortLabels[key]}
          {currentSort === key && <Check size={14} style={{ color: accentColor }} />}
        </button>
      ))}
    </div>
  )
}
