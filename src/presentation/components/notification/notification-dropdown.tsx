'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import type { Notification } from '@/domain/entities/notification'
import { NOTIFICATION_TYPE_CONFIG } from '@/domain/entities/notification'
import { NotificationIcon } from '@/presentation/components/notification/notification-icon'
import { NotificationActions } from '@/presentation/components/notification/notification-actions'
import { NotificationEmpty } from '@/presentation/components/notification/notification-empty'

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
  unreadCount: number
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onAction: (id: string, status: 'accepted' | 'rejected') => void
  onNavigate?: (notification: Notification) => void
}

export function NotificationDropdown({
  isOpen, onClose, notifications, unreadCount,
  onMarkAsRead, onMarkAllAsRead, onAction, onNavigate,
}: NotificationDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleItemClick = (n: Notification) => {
    if (!n.isRead) onMarkAsRead(n.id)
    if (n.actionStatus === 'pending') return

    if (onNavigate) {
      onNavigate(n)
    } else {
      const config = NOTIFICATION_TYPE_CONFIG[n.type]
      if (config.navigationTarget === 'profile') router.push('/profile')
      else if (config.navigationTarget === 'bubble_detail' && n.bubbleId) router.push(`/bubbles/${n.bubbleId}`)
      else if (config.navigationTarget === 'actor_profile' && n.actorId) router.push(`/bubbler/${n.actorId}`)
    }
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-[190]" style={{ backgroundColor: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div
        ref={ref}
        className="fixed right-4 z-[200] flex flex-col overflow-hidden"
        style={{
          top: '90px',
          width: '300px',
          maxHeight: '400px',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          transformOrigin: 'top right',
          animation: 'dropdown-in 0.16s ease',
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>알림</span>
          {unreadCount > 0 && (
            <button type="button" onClick={onMarkAllAsRead} style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
              모두 읽음
            </button>
          )}
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <NotificationEmpty />
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleItemClick(n)}
                className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors"
                style={{
                  backgroundColor: n.isRead ? 'transparent' : 'color-mix(in srgb, var(--accent-food) 5%, transparent)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {/* 아이콘 */}
                <div className="mt-0.5">
                  <NotificationIcon type={n.type} />
                </div>

                {/* 컨텐츠 */}
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: '13px', fontWeight: n.isRead ? 500 : 600, color: 'var(--text)' }}>{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>{n.body}</p>
                  )}
                  <p className="mt-0.5" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{formatTimeAgo(n.createdAt)}</p>

                  {/* 액션 버튼 */}
                  <NotificationActions
                    actionStatus={n.actionStatus}
                    onAccept={() => onAction(n.id, 'accepted')}
                    onReject={() => onAction(n.id, 'rejected')}
                  />
                </div>

                {/* 미읽음 dot */}
                {!n.isRead && (
                  <div
                    className="mt-2 h-[6px] w-[6px] shrink-0 rounded-full"
                    style={{ backgroundColor: 'var(--brand)', border: '1.5px solid var(--bg)' }}
                  />
                )}
              </button>
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-center py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => { router.push('/settings'); onClose() }}
            style={{ fontSize: '12px', color: 'var(--accent-social)' }}
          >
            알림 설정 →
          </button>
        </div>
      </div>
    </>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}
