import { createClient } from '@/infrastructure/supabase/client'
import type { NotificationRepository } from '@/domain/repositories/notification-repository'
import type { Notification } from '@/domain/entities/notification'

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
    if (error) throw error
    return (data ?? []).map(mapNotification)
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    if (error) throw error
    return count ?? 0
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    if (error) throw error
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    if (error) throw error
  }

  async updateActionStatus(notificationId: string, status: 'accepted' | 'rejected'): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ action_status: status, is_read: true })
      .eq('id', notificationId)
    if (error) throw error
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        action_status: notification.actionStatus,
        actor_id: notification.actorId,
        bubble_id: notification.bubbleId,
      })
      .select()
      .single()
    if (error) throw error
    return mapNotification(data)
  }

  subscribeToNotifications(
    userId: string,
    onNew: (notification: Notification) => void,
  ): { unsubscribe: () => void } {
    const supabase = this.supabase
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNew(mapNotification(payload.new as Record<string, unknown>))
        },
      )
      .subscribe()

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel)
      },
    }
  }
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as Notification['type'],
    title: (row.title as string) ?? '',
    body: (row.body as string) ?? null,
    isRead: (row.is_read as boolean) ?? false,
    actionStatus: (row.action_status as Notification['actionStatus']) ?? null,
    actorId: (row.actor_id as string) ?? null,
    bubbleId: (row.bubble_id as string) ?? null,
    createdAt: row.created_at as string,
  }
}
