'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useNotifications } from '@/application/hooks/use-notifications'
import { NotificationDropdown } from '@/presentation/components/notification/notification-dropdown'
import { NotificationBell } from '@/presentation/components/layout/notification-bell'
import { AvatarDropdown } from '@/presentation/components/layout/avatar-dropdown'

interface AppHeaderProps {
  variant?: 'main' | 'inner'
  title?: string
  backHref?: string
  actions?: React.ReactNode
}

export function AppHeader({ variant = 'main', title, backHref, actions }: AppHeaderProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, handleAction } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <>
      <header className="top-fixed app-header">
        {variant === 'inner' ? (
          <button type="button" onClick={handleBack} className="inner-back-btn">
            <ChevronLeft />
            {title && <span>{title}</span>}
          </button>
        ) : (
          <h1 onClick={() => router.push('/')} className="header-brand">
            nyam
          </h1>
        )}

        <div className="header-right">
          {actions}
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
          {user && (
            <AvatarDropdown
              nickname={user.nickname ?? '?'}
              avatarUrl={user.avatarUrl ?? null}
              avatarColor={null}
            />
          )}
        </div>
      </header>

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
