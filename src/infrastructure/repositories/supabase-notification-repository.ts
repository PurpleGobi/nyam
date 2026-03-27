import { createClient } from '@/infrastructure/supabase/client'
import type { NotificationRepository } from '@/domain/repositories/notification-repository'
import type { Notification, ActionStatus } from '@/domain/entities/notification'

export class SupabaseNotificationRepository implements NotificationRepository {
  private get supabase() {
    return createClient()
  }

  async getNotifications(userId: string, limit: number): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`알림 조회 실패: ${error.message}`)
    return (data ?? []).map(mapNotification)
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) return 0
    return count ?? 0
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
  }

  async updateActionStatus(notificationId: string, status: ActionStatus): Promise<void> {
    await this.supabase
      .from('notifications')
      .update({ action_status: status, is_read: true })
      .eq('id', notificationId)
  }
}

function mapNotification(r: Record<string, unknown>): Notification {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    notificationType: r.notification_type as Notification['notificationType'],
    actorId: r.actor_id as string | null,
    targetType: r.target_type as string | null,
    targetId: r.target_id as string | null,
    bubbleId: r.bubble_id as string | null,
    metadata: r.metadata as Notification['metadata'],
    isRead: r.is_read as boolean,
    actionStatus: r.action_status as Notification['actionStatus'],
    createdAt: r.created_at as string,
  }
}
