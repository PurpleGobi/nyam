'use client'

interface TagProps {
  variant?: 'default' | 'food' | 'wine'
  children: React.ReactNode
}

export function Tag({ variant = 'default', children }: TagProps) {
  const cls = variant === 'default' ? 'tag' : `tag ${variant}`
  return <span className={cls}>{children}</span>
}
