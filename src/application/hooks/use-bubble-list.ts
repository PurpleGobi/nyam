'use client'

import { useState, useEffect } from 'react'
import type { Bubble } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export function useBubbleList(userId: string | null) {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [isLoading, setIsLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return
    bubbleRepo.findByUserId(userId).then((data) => {
      setBubbles(data)
      setIsLoading(false)
    })
  }, [userId])

  return { bubbles, isLoading }
}
