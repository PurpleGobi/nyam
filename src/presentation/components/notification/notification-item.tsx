'use client'

import type { Notification, ActionStatus } from '@/domain/entities/notification'
import { NotificationIcon } from '@/presentation/components/notification/notification-icon'
import { NotificationActions } from '@/presentation/components/notification/notification-actions'

interface NotificationItemProps {
  notification: Notification
  onPress: (notification: Notification) => void
  onAction: (id: string, status: ActionStatus) => void
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
        <NotificationIcon type={n.notificationType} />
      </div>

      <div className="min-w-0 flex-1">
        <p style={{ fontSize: '13px', color: 'var(--text)' }}>
          {formatNotification(n)}
        </p>
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
          style={{ backgroundColor: 'var(--negative)' }}
        />
      )}
    </button>
  )
}

function formatNotification(n: Notification): string {
  const meta = n.metadata as Record<string, string> | null
  switch (n.notificationType) {
    case 'level_up':
      return `${meta?.axis ?? ''} 레벨 ${meta?.level ?? ''} 달성!`
    case 'bubble_join_request':
      return `${meta?.nickname ?? ''}님이 가입 신청`
    case 'bubble_join_approved':
      return '가입이 승인되었습니다'
    case 'follow_request':
      return `${meta?.nickname ?? ''}님이 팔로우 요청`
    case 'follow_accepted':
      return `${meta?.nickname ?? ''}님이 팔로우 수락`
    case 'bubble_invite':
      return `${meta?.bubble_name ?? '버블'}에 초대되었습니다`
    case 'bubble_new_record':
      return `${meta?.nickname ?? ''}님이 새 기록을 남겼습니다`
    case 'bubble_member_joined':
      return `${meta?.nickname ?? ''}님이 버블에 가입했습니다`
    case 'reaction_like':
      return `${meta?.nickname ?? ''}님이 좋아합니다`
    case 'comment_reply':
      return `${meta?.nickname ?? ''}님이 댓글을 남겼습니다`
    default:
      return '새 알림'
  }
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
