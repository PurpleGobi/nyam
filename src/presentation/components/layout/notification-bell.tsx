'use client'

import { Bell } from 'lucide-react'
import { UnreadBadge } from '@/presentation/components/notification/unread-badge'

interface NotificationBellProps {
  unreadCount: number
  onClick: () => void
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button type="button" onClick={onClick} className="icon-btn">
      <Bell size={20} />
      <UnreadBadge count={unreadCount} />
    </button>
  )
}
