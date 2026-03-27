'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useNotifications } from '@/application/hooks/use-notifications'
import { NotificationDropdown } from '@/presentation/components/notification/notification-dropdown'
import { UnreadBadge } from '@/presentation/components/notification/unread-badge'

interface AppHeaderProps {
  variant?: 'main' | 'inner'
  title?: string
  backHref?: string
}

export function AppHeader({ variant = 'main', title, backHref }: AppHeaderProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, updateAction } = useNotifications(user?.id ?? null)
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{
          height: '52px',
          backgroundColor: 'rgba(248,246,243,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* 좌측 */}
        {variant === 'inner' && backHref ? (
          <button type="button" onClick={() => router.push(backHref)} className="flex h-11 w-11 items-center justify-center">
            <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
          </button>
        ) : (
          <h1
            style={{
              fontFamily: 'var(--font-logo)',
              fontSize: '22px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #FF6038, #8B7396)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            nyam
          </h1>
        )}

        {/* 중앙 */}
        {title && (
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{title}</span>
        )}

        {/* 우측 */}
        <div className="flex items-center gap-2">
          {variant === 'main' && (
            <button
              type="button"
              onClick={() => router.push('/bubbles')}
              style={{
                fontFamily: 'var(--font-logo)',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--brand)',
                background: 'none',
                border: 'none',
                padding: '4px 0',
              }}
            >
              bubbles
            </button>
          )}
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-10 w-10 items-center justify-center"
          >
            <Bell size={20} style={{ color: 'var(--text-sub)' }} />
            <UnreadBadge count={unreadCount} />
          </button>

          {user && (
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--accent-food)' }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                {user.nickname?.[0] ?? '?'}
              </span>
            </button>
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
        onAction={updateAction}
      />
    </>
  )
}
