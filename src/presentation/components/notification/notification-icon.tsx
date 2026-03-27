'use client'

import {
  Trophy, UserPlus, CheckCircle, UserCheck, Mail,
  FilePlus, Users, Heart, MessageCircle, Bell,
} from 'lucide-react'
import type { NotificationType } from '@/domain/entities/notification'
import { NOTIFICATION_TYPE_CONFIG } from '@/domain/entities/notification'

const ICON_MAP: Record<NotificationType, typeof Bell> = {
  level_up: Trophy,
  bubble_join_request: UserPlus,
  bubble_join_approved: CheckCircle,
  follow_request: UserPlus,
  follow_accepted: UserCheck,
  bubble_invite: Mail,
  bubble_new_record: FilePlus,
  bubble_member_joined: Users,
  reaction_like: Heart,
  comment_reply: MessageCircle,
}

interface NotificationIconProps {
  type: NotificationType
}

export function NotificationIcon({ type }: NotificationIconProps) {
  const config = NOTIFICATION_TYPE_CONFIG[type]
  const Icon = ICON_MAP[type] ?? Bell

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `${config.iconColor}15` }}
    >
      <Icon size={14} style={{ color: config.iconColor }} />
    </div>
  )
}
