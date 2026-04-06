'use client'

import { useState, useEffect } from 'react'
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
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!bubbleId) {
      setBubble(null)
      return
    }

    let cancelled = false
    setIsLoading(true)

    bubbleRepo.findById(bubbleId).then((result) => {
      if (!cancelled) {
        setBubble(result)
        setIsLoading(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setBubble(null)
        setIsLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [bubbleId])

  return { bubble, isLoading }
}
