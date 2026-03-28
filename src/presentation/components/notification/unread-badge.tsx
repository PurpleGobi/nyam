'use client'

interface UnreadBadgeProps {
  count: number
}

export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count === 0) return null

  return <div className="notif-badge" />
}
