'use client'

import { forwardRef } from 'react'

interface FilterChipProps {
  active?: boolean
  variant?: 'food' | 'wine' | 'social'
  count?: number
  children: React.ReactNode
  onClick?: () => void
}

export function FilterChip({ active, variant = 'food', count, children, onClick }: FilterChipProps) {
  const cls = [
    'filter-chip',
    active ? 'active' : '',
    active && variant !== 'food' ? variant : '',
  ].filter(Boolean).join(' ')

  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
      {count !== undefined && <span className="filter-chip-count">{count}</span>}
    </button>
  )
}

interface FilterChipGroupProps {
  children: React.ReactNode
  className?: string
}

export const FilterChipGroup = forwardRef<HTMLDivElement, FilterChipGroupProps>(
  function FilterChipGroup({ children, className = '' }, ref) {
    return (
      <div ref={ref} className={`flex gap-2 overflow-x-auto scrollbar-hide ${className}`}>
        {children}
      </div>
    )
  }
)
