'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import type { Bubble, BubbleMemberRole } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export function useBubbleDetail(bubbleId: string | null, userId: string | null) {
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [myRole, setMyRole] = useState<BubbleMemberRole | null>(null)
  const [tasteMatch, setTasteMatch] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(async () => {
    if (!bubbleId) return
    const [b, result] = await Promise.all([
      bubbleRepo.findById(bubbleId),
      bubbleRepo.getMembers(bubbleId),
    ])
    setBubble(b)
    if (userId) {
      const me = result.data.find((m) => m.userId === userId && m.status === 'active')
      setMyRole(me?.role ?? null)
      setTasteMatch(me?.tasteMatchPct ?? null)
    } else {
      setMyRole(null)
      setTasteMatch(null)
    }
  }, [bubbleId, userId])

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

  return { bubble, myRole, tasteMatch, isLoading: isPending, refetch: load }
}
