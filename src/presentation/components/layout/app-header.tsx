'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useNotifications } from '@/application/hooks/use-notifications'
import { useXp } from '@/application/hooks/use-xp'
import { NotificationDropdown } from '@/presentation/components/notification/notification-dropdown'
import { NotificationBell } from '@/presentation/components/layout/notification-bell'
import { HeaderLevelBar } from '@/presentation/components/layout/header-level-bar'
import { AvatarDropdown } from '@/presentation/components/layout/avatar-dropdown'

export function AppHeader() {
  const router = useRouter()
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, handleAction } = useNotifications()
  const { levelInfo } = useXp(user?.id ?? null)
  const [notifOpen, setNotifOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const getBellPosition = () => {
    if (!bellRef.current) return { top: 56, right: 16 }
    const rect = bellRef.current.getBoundingClientRect()
    return {
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    }
  }

  return (
    <>
      <header className="top-fixed">
        <div className="app-header">
          <h1 onClick={() => router.push('/')} className="header-brand">
            nyam
          </h1>

          <div className="header-right">
            <div ref={bellRef}>
              <NotificationBell
                unreadCount={unreadCount}
                onClick={() => setNotifOpen(!notifOpen)}
              />
            </div>
            {levelInfo && <HeaderLevelBar levelInfo={levelInfo} />}
            {user && (
              <AvatarDropdown
                nickname={user.nickname ?? '?'}
                avatarUrl={user.avatarUrl ?? null}
                avatarColor={null}
              />
            )}
          </div>
        </div>
      </header>
      <div className="header-spacer" style={{ height: '46px' }} />

      <NotificationDropdown
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onAction={handleAction}
        position={getBellPosition()}
      />
    </>
  )
}
