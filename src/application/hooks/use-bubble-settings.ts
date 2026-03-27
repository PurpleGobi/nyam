'use client'

import { useState, useCallback } from 'react'
import type { Bubble } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export function useBubbleSettings(bubbleId: string) {
  const [isLoading, setIsLoading] = useState(false)

  const updateSettings = useCallback(async (updates: Partial<Bubble>): Promise<Bubble> => {
    setIsLoading(true)
    try {
      return await bubbleRepo.update(bubbleId, updates)
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  const deleteBubble = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      await bubbleRepo.delete(bubbleId)
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  return { updateSettings, deleteBubble, isLoading }
}
