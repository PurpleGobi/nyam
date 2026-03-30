'use client'

import { useState } from 'react'
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

  return (
    <>
      <header className="top-fixed">
        <div className="app-header">
          <h1 onClick={() => router.push('/')} className="header-brand">
            nyam
          </h1>

          <div className="header-right">
            <button
              type="button"
              onClick={() => router.push('/bubbles')}
              className="header-bubbles"
            >
              bubbles
            </button>
            <NotificationBell
              unreadCount={unreadCount}
              onClick={() => setNotifOpen(!notifOpen)}
            />
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
      />
    </>
  )
}
