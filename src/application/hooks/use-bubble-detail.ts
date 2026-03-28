'use client'

import { useState, useEffect } from 'react'
import type { Bubble, BubbleMember, BubbleMemberRole } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export function useBubbleDetail(bubbleId: string, userId: string | null) {
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [myRole, setMyRole] = useState<BubbleMemberRole | null>(null)
  const [tasteMatch, setTasteMatch] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      bubbleRepo.findById(bubbleId),
      bubbleRepo.getMembers(bubbleId),
    ]).then(([b, result]) => {
      if (cancelled) return
      setBubble(b)
      if (userId) {
        const me = result.data.find((m) => m.userId === userId && m.status === 'active')
        setMyRole(me?.role ?? null)
        setTasteMatch(me?.tasteMatchPct ?? null)
      }
      setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [bubbleId, userId])

  const refetch = () => {
    bubbleRepo.findById(bubbleId).then(setBubble)
  }

  return { bubble, myRole, tasteMatch, isLoading, refetch }
}
