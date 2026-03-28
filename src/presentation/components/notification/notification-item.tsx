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
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
      style={{
        backgroundColor: n.isRead
          ? 'transparent'
          : 'color-mix(in srgb, var(--accent-food) 5%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="mt-0.5">
        <NotificationIcon type={n.type} />
      </div>

      <div className="min-w-0 flex-1">
        <p style={{ fontSize: '13px', fontWeight: n.isRead ? 400 : 600, color: 'var(--text)' }}>
          {n.title}
        </p>
        {n.body && (
          <p className="mt-0.5" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>{n.body}</p>
        )}
        <p className="mt-0.5" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
          {formatTimeAgo(n.createdAt)}
        </p>

        <NotificationActions
          actionStatus={n.actionStatus}
          onAccept={() => onAction(n.id, 'accepted')}
          onReject={() => onAction(n.id, 'rejected')}
        />
      </div>

      {!n.isRead && (
        <div
          className="mt-2 h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ backgroundColor: 'var(--brand)', border: '1.5px solid var(--bg)' }}
        />
      )}
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
