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
      <header
        className="sticky top-0 z-[60] flex items-center justify-between"
        style={{
          padding: '2px 16px 8px',
          backgroundColor: 'rgba(248,246,243,0.55)',
          backdropFilter: 'blur(20px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
          boxShadow: '0 1px 12px rgba(0,0,0,0.08)',
        }}
      >
        {variant === 'inner' ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={handleBack} className="flex h-11 w-11 items-center justify-center">
              <ChevronLeft size={20} style={{ color: 'var(--text)' }} />
            </button>
            {title && (
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{title}</span>
            )}
          </div>
        ) : (
          <h1
            onClick={() => router.push('/')}
            className="header-logo"
            style={{
              fontFamily: 'var(--font-logo)',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            nyam
            <style>{`
              .header-logo {
                background: linear-gradient(135deg, #FF6038, #8B7396);
              }
              .dark .header-logo,
              [data-theme="dark"] .header-logo {
                background: linear-gradient(135deg, #FF8060, #B8A0C8);
              }
            `}</style>
          </h1>
        )}

        <div className="flex items-center" style={{ gap: '6px' }}>
          {variant === 'main' ? (
            <>
              <button
                type="button"
                onClick={() => router.push('/bubbles')}
                style={{ fontFamily: 'var(--font-logo)', fontSize: '13px', fontWeight: 700, color: 'var(--brand)', background: 'none', border: 'none', padding: '4px 0' }}
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
            </>
          ) : (
            actions
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
