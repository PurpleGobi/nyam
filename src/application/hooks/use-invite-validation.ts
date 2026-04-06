'use client'

import { useState, useEffect } from 'react'
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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!inviteCode) {
      setBubble(null)
      setIsExpired(false)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    bubbleRepo.validateInviteCode(inviteCode).then(({ valid, bubble: b, expired }) => {
      if (cancelled) return
      if (valid && b) {
        setBubble(b)
      } else {
        setBubble(null)
      }
      setIsExpired(expired)
      setIsLoading(false)
    }).catch(() => {
      if (!cancelled) {
        setBubble(null)
        setIsExpired(false)
        setIsLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [inviteCode])

  return { bubble, isExpired, isLoading }
}
