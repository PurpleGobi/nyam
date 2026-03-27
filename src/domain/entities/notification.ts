// src/domain/entities/notification.ts
// R1: 외부 의존 0

export type NotificationType =
  | 'level_up'
  | 'bubble_join_request'
  | 'bubble_join_approved'
  | 'follow_request'
  | 'follow_accepted'
  | 'bubble_invite'
  | 'bubble_new_record'
  | 'bubble_member_joined'
  | 'reaction_like'
  | 'comment_reply'

export type ActionStatus = 'pending' | 'accepted' | 'rejected' | null

export interface Notification {
  id: string
  userId: string
  notificationType: NotificationType
  actorId: string | null
  targetType: string | null
  targetId: string | null
  bubbleId: string | null
  metadata: globalThis.Record<string, unknown> | null
  isRead: boolean
  actionStatus: ActionStatus
  createdAt: string
}

export interface NotificationTypeConfig {
  icon: string
  iconColor: string
  hasAction: boolean
}

export const NOTIFICATION_TYPE_CONFIG: globalThis.Record<NotificationType, NotificationTypeConfig> = {
  level_up: { icon: 'trophy', iconColor: '#C9A96E', hasAction: false },
  bubble_join_request: { icon: 'user-plus', iconColor: '#7A9BAE', hasAction: true },
  bubble_join_approved: { icon: 'check-circle', iconColor: '#7EAE8B', hasAction: false },
  follow_request: { icon: 'user-plus', iconColor: '#8B7396', hasAction: true },
  follow_accepted: { icon: 'user-check', iconColor: '#7EAE8B', hasAction: false },
  bubble_invite: { icon: 'mail', iconColor: '#7A9BAE', hasAction: true },
  bubble_new_record: { icon: 'file-plus', iconColor: '#C17B5E', hasAction: false },
  bubble_member_joined: { icon: 'users', iconColor: '#7A9BAE', hasAction: false },
  reaction_like: { icon: 'heart', iconColor: '#B87272', hasAction: false },
  comment_reply: { icon: 'message-circle', iconColor: '#8B7396', hasAction: false },
}
