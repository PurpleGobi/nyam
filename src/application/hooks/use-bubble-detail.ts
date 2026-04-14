'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import type { Bubble, BubbleMemberRole } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export function useBubbleDetail(bubbleId: string | null, userId: string | null) {
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [myRole, setMyRole] = useState<BubbleMemberRole | null>(null)
  const [myStatus, setMyStatus] = useState<'active' | 'pending' | null>(null)
  const [tasteMatch, setTasteMatch] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const applyMembers = useCallback((members: Array<{ userId: string; role: BubbleMemberRole; status: string; tasteMatchPct: number | null }>, uid: string | null) => {
    if (!uid) { setMyRole(null); setMyStatus(null); setTasteMatch(null); return }
    // active 먼저, 없으면 pending
    const active = members.find((m) => m.userId === uid && m.status === 'active')
    if (active) {
      setMyRole(active.role); setMyStatus('active'); setTasteMatch(active.tasteMatchPct); return
    }
    const pending = members.find((m) => m.userId === uid && m.status === 'pending')
    if (pending) {
      setMyRole(pending.role); setMyStatus('pending'); setTasteMatch(null); return
    }
    setMyRole(null); setMyStatus(null); setTasteMatch(null)
  }, [])

  const load = useCallback(async () => {
    if (!bubbleId) return
    const [b, result] = await Promise.all([
      bubbleRepo.findById(bubbleId),
      bubbleRepo.getMembers(bubbleId),
    ])
    setBubble(b)
    applyMembers(result.data, userId)
  }, [bubbleId, userId, applyMembers])

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
      applyMembers(result.data, userId)
    })
    return () => { cancelled = true }
  }, [bubbleId, userId, startTransition, applyMembers])

  return { bubble, myRole, myStatus, tasteMatch, isLoading: isPending, refetch: load }
}
