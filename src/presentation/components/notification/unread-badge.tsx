'use client'

interface UnreadBadgeProps {
  count: number
}

export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count === 0) return null

  return (
    <div
      className="absolute right-1 top-1 h-[7px] w-[7px] rounded-full"
      style={{ backgroundColor: 'var(--brand)' }}
    />
  )
}
