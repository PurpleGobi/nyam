'use client'

import { Bell } from 'lucide-react'

export function NotificationEmpty() {
  return (
    <div className="empty-state">
      <Bell size={28} className="empty-state-icon" />
      <p className="empty-state-desc">아직 알림이 없어요</p>
    </div>
  )
}
