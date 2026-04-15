'use client'

import { useState, useEffect } from 'react'
import type { Bubble } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export function useBubbleList(userId: string | null, refreshKey = 0) {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [pendingBubbleIds, setPendingBubbleIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    Promise.all([
      bubbleRepo.findByUserId(userId),
      bubbleRepo.getPendingBubbleIds(userId),
    ]).then(([data, pendingIds]) => {
      if (cancelled) return
      setBubbles(data)
      setPendingBubbleIds(new Set(pendingIds))
      setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [userId, refreshKey])

  return { bubbles, pendingBubbleIds, isLoading }
}
