'use client'

import useSWR, { useSWRConfig } from 'swr'
import { useCallback, useEffect, useState } from 'react'
import { notificationRepo, bubbleRepo } from '@/shared/di/container'
import { useAuth } from '@/presentation/providers/auth-provider'
import type { Notification } from '@/domain/entities/notification'

const DEFAULT_SHARE_RULE = { mode: 'all' as const, rules: [] as never[], conjunction: 'and' as const }

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

  // ── 선택 모드 ──
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => {
      if (prev) setSelectedIds(new Set())
      return !prev
    })
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    const allIds = (notifications ?? []).map((n) => n.id)
    setSelectedIds((prev) => prev.size === allIds.length ? new Set() : new Set(allIds))
  }, [notifications])

  const deleteSelected = useCallback(async () => {
    if (!userId || selectedIds.size === 0) return
    const ids = Array.from(selectedIds)

    // 낙관적 업데이트
    const unreadDelta = (notifications ?? []).filter((n) => ids.includes(n.id) && !n.isRead).length
    mutate(
      ['notifications', userId],
      (prev: Notification[] | undefined) => prev?.filter((n) => !ids.includes(n.id)),
      false,
    )
    mutate(
      ['unread-count', userId],
      (prev: number | undefined) => Math.max(0, (prev ?? 0) - unreadDelta),
      false,
    )

    setSelectedIds(new Set())
    setIsSelectMode(false)

    await notificationRepo.deleteNotifications(ids)
  }, [userId, selectedIds, notifications, mutate])

  const handleAction = useCallback(async (
    notificationId: string,
    action: 'accepted' | 'rejected',
  ) => {
    if (!userId) return

    // 알림 객체 찾기 (사이드 이펙트용)
    const notification = (notifications ?? []).find((n) => n.id === notificationId)

    // 낙관적 UI 업데이트
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

    // 알림 유형별 사이드 이펙트
    if (notification) {
      await executeNotificationSideEffect(notification, action, userId)
    }
  }, [userId, mutate, notifications])

  return {
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    isLoading,
    markAsRead,
    markAllAsRead,
    handleAction,
    isSelectMode,
    selectedIds,
    toggleSelectMode,
    toggleSelect,
    selectAll,
    deleteSelected,
  }
}

/** 알림 수락/거절 시 실제 비즈니스 로직 실행 */
async function executeNotificationSideEffect(
  notification: Notification,
  action: 'accepted' | 'rejected',
  currentUserId: string,
) {
  const { type, bubbleId, actorId } = notification

  // bubble_join_request: owner가 가입 신청 수락/거절
  if (type === 'bubble_join_request' && bubbleId && actorId) {
    if (action === 'accepted') {
      await bubbleRepo.updateMember(bubbleId, actorId, { status: 'active' } as Partial<import('@/domain/entities/bubble').BubbleMember>)
      await bubbleRepo.updateShareRule(bubbleId, actorId, DEFAULT_SHARE_RULE)
      // 신청자에게 승인 알림
      notificationRepo.createNotification({
        userId: actorId,
        type: 'bubble_join_approved',
        title: '버블 가입이 승인되었어요!',
        body: null,
        actionStatus: null,
        actorId: currentUserId,
        targetType: 'bubble',
        targetId: bubbleId,
        bubbleId,
      }).catch(() => {})
    } else {
      await bubbleRepo.updateMember(bubbleId, actorId, { status: 'rejected' } as Partial<import('@/domain/entities/bubble').BubbleMember>)
    }
  }

  // bubble_invite: 초대받은 사람이 수락/거절
  if (type === 'bubble_invite' && bubbleId) {
    if (action === 'accepted') {
      await bubbleRepo.addMember(bubbleId, currentUserId, 'member', 'active')
      await bubbleRepo.updateShareRule(bubbleId, currentUserId, DEFAULT_SHARE_RULE)
      // owner에게 가입 알림
      if (actorId) {
        notificationRepo.createNotification({
          userId: actorId,
          type: 'bubble_member_joined',
          title: '초대한 멤버가 버블에 가입했어요!',
          body: null,
          actionStatus: null,
          actorId: currentUserId,
          targetType: 'bubble',
          targetId: bubbleId,
          bubbleId,
        }).catch(() => {})
      }
    }
    // rejected → 아무것도 안 함 (멤버 추가 안 됨)
  }
}
