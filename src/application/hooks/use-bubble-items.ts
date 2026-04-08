'use client'

import { useState, useEffect, useCallback } from 'react'
import { bubbleRepo } from '@/shared/di/container'
import type { BubbleItemSource } from '@/domain/entities/bubble'

interface BubbleWithItemStatus {
  bubbleId: string
  bubbleName: string
  bubbleIcon: string | null
  bubbleIconBgColor: string | null
  isIncluded: boolean
}

/**
 * 버블 큐레이션 아이템 관리 hook
 * presentation에서 bubbleRepo 직접 접근 없이 아이템 추가/제거 가능 (R4)
 */
export function useBubbleItems(userId: string | null, targetId: string | null, targetType: 'restaurant' | 'wine') {
  const [bubblesWithStatus, setBubblesWithStatus] = useState<BubbleWithItemStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchStatus = useCallback(async () => {
    if (!userId || !targetId) return
    setIsLoading(true)
    try {
      const memberships = await bubbleRepo.getUserBubbles(userId)
      const activeMemberships = memberships.filter((m) => m.status === 'active')

      const statusList = await Promise.all(
        activeMemberships.map(async (m) => {
          const isIncluded = await bubbleRepo.isItemInBubble(m.bubbleId, targetId, targetType)
          return {
            bubbleId: m.bubbleId,
            bubbleName: m.bubbleName ?? '',
            bubbleIcon: m.bubbleIcon ?? null,
            bubbleIconBgColor: m.bubbleIconBgColor ?? null,
            isIncluded,
          }
        }),
      )
      setBubblesWithStatus(statusList)
    } finally {
      setIsLoading(false)
    }
  }, [userId, targetId, targetType])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const toggleItem = useCallback(async (bubbleId: string, include: boolean) => {
    if (!targetId) return
    if (include) {
      await bubbleRepo.addItem(bubbleId, targetId, targetType, 'manual' as BubbleItemSource)
    } else {
      await bubbleRepo.removeItem(bubbleId, targetId, targetType)
    }
    setBubblesWithStatus((prev) =>
      prev.map((b) => (b.bubbleId === bubbleId ? { ...b, isIncluded: include } : b)),
    )
  }, [targetId, targetType])

  const addItemToBubble = useCallback(async (
    bubbleId: string, itemTargetId: string, itemTargetType: 'restaurant' | 'wine', source: BubbleItemSource = 'manual',
  ) => {
    await bubbleRepo.addItem(bubbleId, itemTargetId, itemTargetType, source)
  }, [])

  return { bubblesWithStatus, isLoading, toggleItem, addItemToBubble, refetch: fetchStatus }
}
