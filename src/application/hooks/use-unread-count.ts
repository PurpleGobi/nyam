'use client'

import useSWR from 'swr'
import { notificationRepo } from '@/shared/di/container'
import { useAuth } from '@/presentation/providers/auth-provider'

export function useUnreadCount() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data: count } = useSWR(
    userId ? ['unread-count', userId] : null,
    ([, id]) => notificationRepo.getUnreadCount(id),
    { refreshInterval: 30000 },
  )

  return { count: count ?? 0 }
}
