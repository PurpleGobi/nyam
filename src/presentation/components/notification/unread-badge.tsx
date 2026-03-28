'use client'

interface UnreadBadgeProps {
  count: number
}

export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count === 0) return null

  return (
    <div
      className="absolute right-0.5 top-0.5 flex h-[7px] w-[7px] items-center justify-center rounded-full"
      style={{ backgroundColor: 'var(--brand)', border: '1.5px solid var(--bg)' }}
    />
  )
}
