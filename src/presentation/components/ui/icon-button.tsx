'use client'

interface IconButtonProps {
  icon: React.ElementType
  active?: boolean
  variant?: 'food' | 'wine'
  size?: number
  onClick?: () => void
}

export function IconButton({ icon: Icon, active, variant = 'food', size = 18, onClick }: IconButtonProps) {
  const cls = [
    'icon-button',
    active ? 'active' : '',
    active && variant === 'wine' ? 'wine' : '',
  ].filter(Boolean).join(' ')

  return (
    <button type="button" className={cls} onClick={onClick}>
      <Icon size={size} />
    </button>
  )
}
