// src/domain/repositories/notification-repository.ts
// R1: 외부 의존 0

import type { Notification, ActionStatus } from '@/domain/entities/notification'

export interface NotificationRepository {
  getNotifications(userId: string, limit: number): Promise<Notification[]>
  getUnreadCount(userId: string): Promise<number>
  markAsRead(notificationId: string): Promise<void>
  markAllAsRead(userId: string): Promise<void>
  updateActionStatus(notificationId: string, status: ActionStatus): Promise<void>
}
