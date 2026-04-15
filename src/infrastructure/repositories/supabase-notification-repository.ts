import { createClient } from '@/infrastructure/supabase/client'
import type { NotificationRepository, PendingBubbleInvite } from '@/domain/repositories/notification-repository'
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
    const row = {
      user_id: notification.userId,
      notification_type: notification.type,
      title: notification.title,
      body: notification.body,
      action_status: notification.actionStatus,
      actor_id: notification.actorId,
      target_type: notification.targetType,
      target_id: notification.targetId,
      bubble_id: notification.bubbleId,
    }
    // 다른 유저에게 알림 보낼 때 RLS로 인해 INSERT 후 SELECT 불가 → select 생략
    const { error } = await this.supabase.from('notifications').insert(row)
    if (error) throw error
    return {
      id: '',
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString(),
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
    if (error) throw error
  }

  async deleteNotifications(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds)
    if (error) throw error
  }

  async deleteNotificationsByCondition(params: { type: string; actorId: string; bubbleId: string }): Promise<void> {
    await this.supabase
      .from('notifications')
      .delete()
      .eq('type', params.type)
      .eq('actor_id', params.actorId)
      .eq('bubble_id', params.bubbleId)
  }

  async getPendingBubbleInvites(bubbleId: string): Promise<PendingBubbleInvite[]> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('id, user_id, created_at, users!notifications_user_id_fkey(nickname, avatar_url, avatar_color)')
      .eq('bubble_id', bubbleId)
      .eq('notification_type', 'bubble_invite')
      .eq('action_status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => {
      const u = row.users as Record<string, unknown> | null
      return {
        notificationId: row.id as string,
        userId: row.user_id as string,
        nickname: (u?.nickname as string) ?? '',
        avatarUrl: (u?.avatar_url as string) ?? null,
        avatarColor: (u?.avatar_color as string) ?? null,
        invitedAt: row.created_at as string,
      }
    })
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
    type: (row.notification_type as Notification['type']),
    title: (row.title as string) ?? '',
    body: (row.body as string) ?? null,
    isRead: (row.is_read as boolean) ?? false,
    actionStatus: (row.action_status as Notification['actionStatus']) ?? null,
    actorId: (row.actor_id as string) ?? null,
    targetType: (row.target_type as string) ?? null,
    targetId: (row.target_id as string) ?? null,
    bubbleId: (row.bubble_id as string) ?? null,
    createdAt: row.created_at as string,
  }
}
