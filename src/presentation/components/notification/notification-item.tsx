'use client'

import type { Notification } from '@/domain/entities/notification'
import { NotificationIcon } from '@/presentation/components/notification/notification-icon'
import { NotificationActions } from '@/presentation/components/notification/notification-actions'

interface NotificationItemProps {
  notification: Notification
  onPress: (notification: Notification) => void
  onAction: (id: string, status: 'accepted' | 'rejected') => void
}

export function NotificationItem({ notification, onPress, onAction }: NotificationItemProps) {
  const n = notification

  return (
    <button
      type="button"
      onClick={() => onPress(n)}
      className={`notif-item w-full text-left ${!n.isRead ? 'unread' : ''}`}
      style={{
        backgroundColor: n.isRead
          ? 'transparent'
          : 'color-mix(in srgb, var(--accent-food) 5%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="notif-icon mt-0.5">
        <NotificationIcon type={n.type} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="notif-title">{n.title}</p>
        {n.body && <p className="notif-body mt-0.5">{n.body}</p>}
        <p className="notif-time mt-0.5">{formatTimeAgo(n.createdAt)}</p>

        <NotificationActions
          actionStatus={n.actionStatus}
          onAccept={() => onAction(n.id, 'accepted')}
          onReject={() => onAction(n.id, 'rejected')}
        />
      </div>

      {!n.isRead && <div className="notif-unread-dot mt-2" />}
    </button>
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
