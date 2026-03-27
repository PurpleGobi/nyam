'use client'

import { Bell } from 'lucide-react'

export function NotificationEmpty() {
  return (
    <div className="flex flex-col items-center py-10">
      <Bell size={28} style={{ color: 'var(--text-hint)' }} />
      <p className="mt-2" style={{ fontSize: '13px', color: 'var(--text-hint)' }}>
        아직 알림이 없어요
      </p>
    </div>
  )
}
