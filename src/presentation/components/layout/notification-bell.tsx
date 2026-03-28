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
      className="relative flex items-center justify-center rounded-full"
      style={{ width: '34px', height: '34px' }}
    >
      <Bell size={20} style={{ color: 'var(--text)' }} />
      <UnreadBadge count={unreadCount} />
    </button>
  )
}
