'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const fetch = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const memberships = await bubbleRepo.getUserBubbles(userId)
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
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    bubbles,
    bubbleIds: bubbles.map((b) => b.id),
    isLoading,
  }
}
