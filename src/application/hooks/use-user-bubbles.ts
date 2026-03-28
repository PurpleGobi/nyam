'use client'

import { useState, useEffect } from 'react'
import { bubbleRepo } from '@/shared/di/container'

interface UserBubbleItem {
  id: string
  name: string
  icon: string | null
  iconBgColor: string | null
}

interface UseUserBubblesResult {
  bubbles: UserBubbleItem[]
  bubbleIds: string[]
  isLoading: boolean
}

export function useUserBubbles(userId: string | null): UseUserBubblesResult {
  const [bubbles, setBubbles] = useState<UserBubbleItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId) return

    setIsLoading(true)
    bubbleRepo.getUserBubbles(userId).then((memberships) => {
      setBubbles(
        memberships
          .filter((m) => m.status === 'active')
          .map((m) => ({
            id: m.bubbleId,
            name: m.bubbleName ?? '',
            icon: m.bubbleIcon ?? null,
            iconBgColor: m.bubbleIconBgColor ?? null,
          })),
      )
    }).finally(() => setIsLoading(false))
  }, [userId])

  return {
    bubbles,
    bubbleIds: bubbles.map((b) => b.id),
    isLoading,
  }
}
