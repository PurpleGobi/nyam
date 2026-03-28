'use client'

import {
  Trophy, CircleDot, CircleCheck, UserPlus, UserCheck, Bell,
} from 'lucide-react'
import type { NotificationType } from '@/domain/entities/notification'
import { NOTIFICATION_TYPE_CONFIG } from '@/domain/entities/notification'

const ICON_MAP: Record<string, typeof Bell> = {
  'trophy': Trophy,
  'circle-dot': CircleDot,
  'circle-check': CircleCheck,
  'user-plus': UserPlus,
  'user-check': UserCheck,
}

interface NotificationIconProps {
  type: NotificationType
}

export function NotificationIcon({ type }: NotificationIconProps) {
  const config = NOTIFICATION_TYPE_CONFIG[type]
  const Icon = ICON_MAP[config?.icon ?? ''] ?? Bell

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `color-mix(in srgb, ${config?.iconColor ?? 'var(--text-sub)'} 15%, transparent)` }}
    >
      <Icon size={16} style={{ color: config?.iconColor ?? 'var(--text-sub)' }} />
    </div>
  )
}
