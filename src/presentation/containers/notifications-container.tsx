"use client"

import { Bell, CheckCheck } from "lucide-react"
import { useNotifications } from "@/application/hooks/use-notifications"
import type { Notification } from "@/application/hooks/use-notifications"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { cn } from "@/shared/utils/cn"

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return new Date(dateStr).toLocaleDateString("ko-KR")
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => !notification.isRead && onRead(notification.id)}
      className={cn(
        "w-full rounded-2xl p-4 text-left transition-colors",
        notification.isRead
          ? "bg-card"
          : "bg-primary-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {notification.title && (
            <p className="text-sm font-semibold text-neutral-800">{notification.title}</p>
          )}
          {notification.body && (
            <p className="mt-0.5 text-xs text-neutral-500">{notification.body}</p>
          )}
          <p className="mt-1 text-[10px] text-neutral-400">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>
        {!notification.isRead && (
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
        )}
      </div>
    </button>
  )
}

export function NotificationsContainer() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 px-4 pt-6 pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-6 pb-4">
      {/* Header with mark all read */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">읽지 않은 알림 {unreadCount}개</p>
          <button
            type="button"
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            모두 읽음
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="알림이 없어요"
          description="새로운 소식이 오면 여기에 표시돼요"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={markAsRead}
            />
          ))}
        </div>
      )}
    </div>
  )
}
