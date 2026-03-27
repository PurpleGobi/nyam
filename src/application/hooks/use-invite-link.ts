'use client'

import { useState, useCallback } from 'react'
import type { Bubble } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export function useInviteLink(bubbleId: string) {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const generateLink = useCallback(async (): Promise<string> => {
    setIsLoading(true)
    try {
      const code = await bubbleRepo.generateInviteCode(bubbleId)
      setInviteCode(code)
      return code
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  const validateLink = useCallback(async (code: string): Promise<Bubble | null> => {
    setIsLoading(true)
    try {
      const bubble = await bubbleRepo.findByInviteCode(code)
      if (!bubble) return null
      if (bubble.inviteExpiresAt && new Date(bubble.inviteExpiresAt) < new Date()) return null
      return bubble
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { inviteCode, generateLink, validateLink, isLoading }
}
