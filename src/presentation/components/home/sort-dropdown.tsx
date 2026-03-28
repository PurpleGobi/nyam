'use client'

import { Check } from 'lucide-react'
import type { SortOption } from '@/domain/entities/saved-filter'

interface SortDropdownProps {
  currentSort: SortOption
  onSortChange: (sort: SortOption) => void
  accentType: 'food' | 'wine'
}

const SORT_LABELS: Record<SortOption, string> = {
  latest: '최신순',
  score_high: '점수 높은순',
  score_low: '점수 낮은순',
  name: '이름순',
  visit_count: '방문 많은순',
}

export function SortDropdown({ currentSort, onSortChange, accentType }: SortDropdownProps) {
  const accentColor = accentType === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div className="ds-sort-dropdown mx-4 py-1">
      {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onSortChange(key)}
          className={`nyam-dropdown-item w-full justify-between ${currentSort === key ? 'selected' : ''}`}
          style={{
            color: currentSort === key ? accentColor : undefined,
          }}
        >
          {SORT_LABELS[key]}
          {currentSort === key && <Check size={14} style={{ color: accentColor }} />}
        </button>
      ))}
    </div>
  )
}
