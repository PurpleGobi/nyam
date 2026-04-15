// src/domain/repositories/notification-repository.ts
// R1: 외부 의존 0

import type { Notification, NotifyPreferences } from '@/domain/entities/notification'

export interface NotificationRepository {
  /** 수신자의 알림 설정 조회 */
  getNotifyPreferences(userId: string): Promise<NotifyPreferences>
  getNotifications(userId: string, limit: number): Promise<Notification[]>
  getUnreadCount(userId: string): Promise<number>
  markAsRead(notificationId: string): Promise<void>
  markAllAsRead(userId: string): Promise<void>
  updateActionStatus(notificationId: string, status: 'accepted' | 'rejected'): Promise<void>
  createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification>
  /** 알림 삭제 (단건) */
  deleteNotification(notificationId: string): Promise<void>
  /** 알림 삭제 (복수) */
  deleteNotifications(notificationIds: string[]): Promise<void>
  /** 특정 조건의 알림 삭제 (가입 신청 취소 등) */
  deleteNotificationsByCondition(params: { type: string; actorId: string; bubbleId: string }): Promise<void>
  /** 버블의 수락 대기 중인 초대 목록 (owner/admin 전용) */
  getPendingBubbleInvites(bubbleId: string): Promise<PendingBubbleInvite[]>
  subscribeToNotifications(
    userId: string,
    onNew: (notification: Notification) => void,
  ): { unsubscribe: () => void }
}

/** 초대 수락 대기 정보 */
export interface PendingBubbleInvite {
  notificationId: string
  userId: string
  nickname: string
  avatarUrl: string | null
  avatarColor: string | null
  invitedAt: string
}
