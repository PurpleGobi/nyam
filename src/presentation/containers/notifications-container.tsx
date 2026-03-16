"use client"

import Link from "next/link"
import { Bell, BellOff, Heart, Share2 } from "lucide-react"
import { useAuthContext } from "@/presentation/providers/auth-provider"
import { useNotifications } from "@/application/hooks/use-notifications"
import type { Notification } from "@/application/hooks/use-notifications"
import { relativeTime } from "@/shared/utils/relative-time"

function NotificationIcon({ type }: { type: Notification["type"] }) {
  if (type === "reaction") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF5F2]">
        <Heart className="h-4 w-4 text-[#FF6038]" />
      </div>
    )
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0F5FF]">
      <Share2 className="h-4 w-4 text-[#3B82F6]" />
    </div>
  )
}

export function NotificationsContainer() {
  const { user } = useAuthContext()
  const { notifications, isLoading } = useNotifications(user?.id)

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-[var(--color-neutral-800)]" />
        <h1 className="text-xl font-bold text-[var(--color-neutral-800)]">
          알림
        </h1>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3"
            >
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[var(--color-neutral-100)]" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-neutral-100)]" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-[var(--color-neutral-100)]" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-16">
          <BellOff className="mb-2 h-6 w-6 text-[var(--color-neutral-400)]" />
          <p className="text-center text-sm text-[var(--color-neutral-500)]">
            새로운 알림이 없습니다
          </p>
        </div>
      ) : (
        /* Notification list */
        <div className="flex flex-col gap-2">
          {notifications.map((notif) => (
            <Link
              key={notif.id}
              href={`/records/${notif.recordId}`}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3 active:bg-[var(--color-neutral-50)]"
            >
              <NotificationIcon type={notif.type} />
              <div className="flex flex-1 flex-col">
                <span className="text-sm text-[var(--color-neutral-800)]">
                  {notif.message}
                </span>
                <span className="mt-0.5 text-xs text-[var(--color-neutral-400)]">
                  {relativeTime(notif.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
