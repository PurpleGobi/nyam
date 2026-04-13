'use client'

import { useState, useEffect, useTransition } from 'react'
import type { Bubble } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

interface UseInviteValidationReturn {
  bubble: Bubble | null
  isExpired: boolean
  isLoading: boolean
}

/**
 * 초대 코드 검증 hook
 * inviteCode 변경 시 자동으로 재검증
 */
export function useInviteValidation(inviteCode: string): UseInviteValidationReturn {
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!inviteCode) return

    let cancelled = false
    startTransition(async () => {
      try {
        const { valid, bubble: b, expired } = await bubbleRepo.validateInviteCode(inviteCode)
        if (cancelled) return
        setBubble(valid && b ? b : null)
        setIsExpired(expired)
      } catch {
        if (!cancelled) {
          setBubble(null)
          setIsExpired(false)
        }
      }
    })

    return () => { cancelled = true }
  }, [inviteCode])

  return { bubble, isExpired, isLoading: isPending }
}
