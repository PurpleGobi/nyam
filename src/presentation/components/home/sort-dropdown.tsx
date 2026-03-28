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
    <div
      className="mx-4 overflow-hidden rounded-xl py-1"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.12)',
      }}
    >
      {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onSortChange(key)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] transition-colors"
          style={{
            color: currentSort === key ? accentColor : 'var(--text)',
            fontWeight: currentSort === key ? 600 : 500,
          }}
        >
          {SORT_LABELS[key]}
          {currentSort === key && <Check size={14} style={{ color: accentColor }} />}
        </button>
      ))}
    </div>
  )
}
