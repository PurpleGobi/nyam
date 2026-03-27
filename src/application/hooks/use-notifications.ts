'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Notification, ActionStatus } from '@/domain/entities/notification'
import { notificationRepo } from '@/shared/di/container'

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [notifs, count] = await Promise.all([
        notificationRepo.getNotifications(userId, 30),
        notificationRepo.getUnreadCount(userId),
      ])
      setNotifications(notifs)
      setUnreadCount(count)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = useCallback(async (id: string) => {
    await notificationRepo.markAsRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    await notificationRepo.markAllAsRead(userId)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }, [userId])

  const updateAction = useCallback(async (id: string, status: ActionStatus) => {
    await notificationRepo.updateActionStatus(id, status)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, actionStatus: status, isRead: true } : n)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, updateAction, refetch: fetchNotifications }
}
