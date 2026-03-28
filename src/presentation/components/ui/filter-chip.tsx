'use client'

interface FilterChipProps {
  active?: boolean
  variant?: 'food' | 'wine'
  children: React.ReactNode
  onClick?: () => void
}

export function FilterChip({ active, variant = 'food', children, onClick }: FilterChipProps) {
  const cls = [
    'filter-chip',
    active ? 'active' : '',
    active && variant === 'wine' ? 'wine' : '',
  ].filter(Boolean).join(' ')

  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  )
}
