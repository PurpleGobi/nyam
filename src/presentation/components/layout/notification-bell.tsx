'use client'

import { Bell } from 'lucide-react'
import { UnreadBadge } from '@/presentation/components/notification/unread-badge'

interface NotificationBellProps {
  unreadCount: number
  onClick: () => void
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-10 w-10 items-center justify-center"
    >
      <Bell size={20} style={{ color: 'var(--text-sub)' }} />
      <UnreadBadge count={unreadCount} />
    </button>
  )
}
