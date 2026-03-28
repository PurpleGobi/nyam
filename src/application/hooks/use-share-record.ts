'use client'

import { useState, useEffect, useCallback } from 'react'
import { bubbleRepo } from '@/shared/di/container'
import { useSocialXp } from '@/application/hooks/use-social-xp'
import { useBonusXp } from '@/application/hooks/use-bonus-xp'

interface ShareableBubble {
  id: string
  name: string
  icon: string | null
  iconBgColor: string | null
  isShared: boolean
  canShare: boolean
  blockReason: string | null
}

interface UseShareRecordResult {
  sharedBubbles: string[]
  availableBubbles: ShareableBubble[]
  shareToBubble: (bubbleId: string) => Promise<void>
  shareToBubbles: (bubbleIds: string[]) => Promise<void>
  unshareBubble: (bubbleId: string) => Promise<void>
  canShare: boolean
  blockReason: string | null
  isLoading: boolean
}

export function useShareRecord(
  userId: string | null,
  recordId: string | null,
): UseShareRecordResult {
  const [availableBubbles, setAvailableBubbles] = useState<ShareableBubble[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { awardSocialXp } = useSocialXp()
  const { awardBonus } = useBonusXp()

  const sharedBubbles = availableBubbles.filter((b) => b.isShared).map((b) => b.id)

  const fetch = useCallback(async () => {
    if (!userId || !recordId) return
    setIsLoading(true)
    try {
      const [userBubbles, existingShares] = await Promise.all([
        bubbleRepo.getUserBubbles(userId),
        bubbleRepo.getRecordShares(recordId),
      ])

      const sharedIds = new Set(existingShares.map((s) => s.bubbleId))
      const items: ShareableBubble[] = userBubbles.map((b) => {
        const isActive = b.status === 'active'
        return {
          id: b.bubbleId,
          name: b.bubbleName ?? '',
          icon: b.bubbleIcon ?? null,
          iconBgColor: b.bubbleIconBgColor ?? null,
          isShared: sharedIds.has(b.bubbleId),
          canShare: isActive,
          blockReason: isActive ? null : '비활성 멤버십',
        }
      })
      setAvailableBubbles(items)
    } finally {
      setIsLoading(false)
    }
  }, [userId, recordId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const shareToBubble = useCallback(async (bubbleId: string) => {
    if (!userId || !recordId) return
    await bubbleRepo.shareRecord(recordId, bubbleId, userId)
    setAvailableBubbles((prev) =>
      prev.map((b) => (b.id === bubbleId ? { ...b, isShared: true } : b)),
    )
    await awardSocialXp(userId, 'share')
    await awardBonus(userId, 'first_share')
  }, [userId, recordId, awardSocialXp, awardBonus])

  const shareToBubbles = useCallback(async (bubbleIds: string[]) => {
    if (!userId || !recordId) return
    for (const bubbleId of bubbleIds) {
      await bubbleRepo.shareRecord(recordId, bubbleId, userId)
      await awardSocialXp(userId, 'share')
    }
    if (bubbleIds.length > 0) {
      await awardBonus(userId, 'first_share')
    }
    setAvailableBubbles((prev) =>
      prev.map((b) => (bubbleIds.includes(b.id) ? { ...b, isShared: true } : b)),
    )
  }, [userId, recordId, awardSocialXp, awardBonus])

  const unshareBubble = useCallback(async (bubbleId: string) => {
    if (!recordId) return
    await bubbleRepo.unshareRecord(recordId, bubbleId)
    setAvailableBubbles((prev) =>
      prev.map((b) => (b.id === bubbleId ? { ...b, isShared: false } : b)),
    )
  }, [recordId])

  const canShare = availableBubbles.some((b) => b.canShare)
  const blockReason = canShare ? null : '공유 가능한 버블이 없습니다'

  return { sharedBubbles, availableBubbles, shareToBubble, shareToBubbles, unshareBubble, canShare, blockReason, isLoading }
}
