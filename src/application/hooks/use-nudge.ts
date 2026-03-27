'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { NudgeDisplay } from '@/domain/entities/nudge'
import { selectTopNudge } from '@/domain/services/nudge-priority'
import { nudgeRepo } from '@/shared/di/container'

export function useNudge(userId: string | null) {
  const [nudge, setNudge] = useState<NudgeDisplay | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!userId || fetchedRef.current) return
    fetchedRef.current = true

    let cancelled = false

    async function load() {
      try {
        const nudges = await nudgeRepo.getActiveNudge(userId as string)
        if (cancelled) return
        const top = selectTopNudge(nudges)
        setNudge(top)
        setIsVisible(top !== null)
      } catch {
        // 넛지 로드 실패 시 조용히 무시
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId])

  const handleAction = useCallback(() => {
    setIsVisible(false)
  }, [])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
  }, [])

  return { nudge, isVisible, handleAction, handleDismiss }
}
