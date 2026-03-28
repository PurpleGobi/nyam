'use client'

interface NyamCardProps {
  state?: 'default' | 'visited' | 'confirmed' | 'wishlisted'
  children: React.ReactNode
  className?: string
}

export function NyamCard({ state = 'default', children, className }: NyamCardProps) {
  const cls = state === 'default' ? 'card' : `card ${state}`
  return <div className={`${cls}${className ? ` ${className}` : ''}`}>{children}</div>
}
