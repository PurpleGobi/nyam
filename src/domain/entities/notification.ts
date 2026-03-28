// src/domain/entities/notification.ts
// R1: 외부 의존 0

/** 알림 유형 (5가지만) */
export type NotificationType =
  | 'level_up'
  | 'bubble_join_request'
  | 'bubble_join_approved'
  | 'follow_request'
  | 'follow_accepted'

/** 액션 상태 */
export type ActionStatus = 'pending' | 'accepted' | 'rejected' | null

/** 알림 엔티티 */
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string | null
  isRead: boolean
  actionStatus: ActionStatus
  actorId: string | null
  bubbleId: string | null
  createdAt: string
}

/** 알림 유형별 설정 */
export interface NotificationTypeConfig {
  type: NotificationType
  icon: string
  iconColor: string
  hasAction: boolean
  navigationTarget: 'profile' | 'bubble_detail' | 'actor_profile'
}

/** 알림 유형 설정 테이블 */
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, NotificationTypeConfig> = {
  level_up: {
    type: 'level_up',
    icon: 'trophy',
    iconColor: 'var(--caution)',
    hasAction: false,
    navigationTarget: 'profile',
  },
  bubble_join_request: {
    type: 'bubble_join_request',
    icon: 'circle-dot',
    iconColor: 'var(--accent-food)',
    hasAction: true,
    navigationTarget: 'bubble_detail',
  },
  bubble_join_approved: {
    type: 'bubble_join_approved',
    icon: 'circle-check',
    iconColor: 'var(--positive)',
    hasAction: false,
    navigationTarget: 'bubble_detail',
  },
  follow_request: {
    type: 'follow_request',
    icon: 'user-plus',
    iconColor: 'var(--accent-social)',
    hasAction: true,
    navigationTarget: 'actor_profile',
  },
  follow_accepted: {
    type: 'follow_accepted',
    icon: 'user-check',
    iconColor: 'var(--accent-social)',
    hasAction: false,
    navigationTarget: 'actor_profile',
  },
}
