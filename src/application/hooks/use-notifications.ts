'use client'

import useSWR, { useSWRConfig } from 'swr'
import { useCallback, useEffect } from 'react'
import { notificationRepo } from '@/shared/di/container'
import { useAuth } from '@/presentation/providers/auth-provider'
import type { Notification } from '@/domain/entities/notification'

const MAX_NOTIFICATIONS = 20

export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { mutate } = useSWRConfig()

  const { data: notifications, isLoading } = useSWR(
    userId ? ['notifications', userId] : null,
    ([, id]) => notificationRepo.getNotifications(id, MAX_NOTIFICATIONS),
  )

  const { data: unreadCount } = useSWR(
    userId ? ['unread-count', userId] : null,
    ([, id]) => notificationRepo.getUnreadCount(id),
  )

  // 실시간 구독
  useEffect(() => {
    if (!userId) return
    const { unsubscribe } = notificationRepo.subscribeToNotifications(userId, () => {
      mutate(['notifications', userId])
      mutate(['unread-count', userId])
    })
    return unsubscribe
  }, [userId, mutate])

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return
    mutate(
      ['notifications', userId],
      (prev: Notification[] | undefined) =>
        prev?.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      false,
    )
    mutate(
      ['unread-count', userId],
      (prev: number | undefined) => Math.max(0, (prev ?? 1) - 1),
      false,
    )
    await notificationRepo.markAsRead(notificationId)
  }, [userId, mutate])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    mutate(
      ['notifications', userId],
      (prev: Notification[] | undefined) =>
        prev?.map((n) => ({ ...n, isRead: true })),
      false,
    )
    mutate(['unread-count', userId], 0, false)
    await notificationRepo.markAllAsRead(userId)
  }, [userId, mutate])

  const handleAction = useCallback(async (
    notificationId: string,
    action: 'accepted' | 'rejected',
  ) => {
    if (!userId) return
    mutate(
      ['notifications', userId],
      (prev: Notification[] | undefined) =>
        prev?.map((n) =>
          n.id === notificationId
            ? { ...n, actionStatus: action, isRead: true }
            : n,
        ),
      false,
    )
    mutate(
      ['unread-count', userId],
      (prev: number | undefined) => Math.max(0, (prev ?? 1) - 1),
      false,
    )
    await notificationRepo.updateActionStatus(notificationId, action)
  }, [userId, mutate])

  return {
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    isLoading,
    markAsRead,
    markAllAsRead,
    handleAction,
  }
}
