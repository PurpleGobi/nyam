'use client'

interface FilterTabProps {
  active?: boolean
  variant?: 'food' | 'wine'
  children: React.ReactNode
  onClick?: () => void
}

export function FilterTab({ active, variant = 'food', children, onClick }: FilterTabProps) {
  const cls = [
    'filter-tab',
    active ? `active ${variant}` : '',
  ].filter(Boolean).join(' ')

  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  )
}
