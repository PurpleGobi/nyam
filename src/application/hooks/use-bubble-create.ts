'use client'

import { useState, useCallback } from 'react'
import type { Bubble } from '@/domain/entities/bubble'
import type { CreateBubbleInput } from '@/domain/repositories/bubble-repository'
import { bubbleRepo, xpRepo } from '@/shared/di/container'

export function useBubbleCreate() {
  const [isLoading, setIsLoading] = useState(false)

  const createBubble = useCallback(async (input: CreateBubbleInput): Promise<Bubble> => {
    setIsLoading(true)
    try {
      const bubble = await bubbleRepo.create(input)

      // 첫 버블 생성 보너스 XP (+5)
      const existing = await bubbleRepo.findByUserId(input.createdBy)
      if (existing.length <= 1) {
        await xpRepo.addXpHistory({
          userId: input.createdBy,
          xpAmount: 5,
          reason: 'bonus_first_bubble',
        })
        await xpRepo.updateUserTotalXp(input.createdBy, 5)
      }

      return bubble
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { createBubble, isLoading }
}
