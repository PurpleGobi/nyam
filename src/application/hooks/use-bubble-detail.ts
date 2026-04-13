'use client'

import { useState, useEffect, useTransition } from 'react'
import type { Bubble, BubbleMemberRole } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export function useBubbleDetail(bubbleId: string | null, userId: string | null) {
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [myRole, setMyRole] = useState<BubbleMemberRole | null>(null)
  const [tasteMatch, setTasteMatch] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!bubbleId) return
    let cancelled = false
    startTransition(async () => {
      const [b, result] = await Promise.all([
        bubbleRepo.findById(bubbleId),
        bubbleRepo.getMembers(bubbleId),
      ])
      if (cancelled) return
      setBubble(b)
      if (userId) {
        const me = result.data.find((m) => m.userId === userId && m.status === 'active')
        setMyRole(me?.role ?? null)
        setTasteMatch(me?.tasteMatchPct ?? null)
      }
    })
    return () => { cancelled = true }
  }, [bubbleId, userId, startTransition])

  const refetch = () => {
    if (bubbleId) bubbleRepo.findById(bubbleId).then(setBubble)
  }

  return { bubble, myRole, tasteMatch, isLoading: isPending, refetch }
}
