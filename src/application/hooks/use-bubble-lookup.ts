'use client'

import { useState, useEffect, useTransition } from 'react'
import type { Bubble } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

interface UseBubbleLookupReturn {
  bubble: Bubble | null
  isLoading: boolean
}

/**
 * 단일 버블 조회 hook
 * bubbleId가 변경될 때마다 자동으로 재조회
 */
export function useBubbleLookup(bubbleId: string | null): UseBubbleLookupReturn {
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [isPending, startTransition] = useTransition()

  // bubbleId가 null로 변경 시 bubble 즉시 초기화 (렌더 중 setState)
  const [prevBubbleId, setPrevBubbleId] = useState(bubbleId)
  if (prevBubbleId !== bubbleId) {
    setPrevBubbleId(bubbleId)
    if (!bubbleId) setBubble(null)
  }

  useEffect(() => {
    if (!bubbleId) return

    let cancelled = false
    startTransition(async () => {
      try {
        const result = await bubbleRepo.findById(bubbleId)
        if (!cancelled) setBubble(result)
      } catch {
        if (!cancelled) setBubble(null)
      }
    })

    return () => { cancelled = true }
  }, [bubbleId, startTransition])

  return { bubble, isLoading: isPending }
}
