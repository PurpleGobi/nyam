'use client'

interface NyamCardProps {
  state?: 'default' | 'visited' | 'confirmed' | 'bookmarked'
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function NyamCard({ state = 'default', children, className, style }: NyamCardProps) {
  const cls = state === 'default' ? 'card' : `card ${state}`
  return <div className={`${cls}${className ? ` ${className}` : ''}`} style={style}>{children}</div>
}
