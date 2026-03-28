'use client'

import { useState, useCallback } from 'react'
import type { Bubble } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export type InviteExpiry = '1d' | '7d' | '30d' | 'unlimited'

export interface InviteValidation {
  valid: boolean
  bubble: Bubble | null
  expired: boolean
}

function expiryToDate(expiry: InviteExpiry): string | null {
  if (expiry === 'unlimited') return null
  const days = expiry === '1d' ? 1 : expiry === '7d' ? 7 : 30
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function useInviteLink(bubbleId: string) {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  /** 초대 링크 생성 (만료 옵션 지원) */
  const generateLink = useCallback(async (expiry: InviteExpiry = '30d'): Promise<string> => {
    setIsLoading(true)
    try {
      const expiresAt = expiryToDate(expiry)
      const code = await bubbleRepo.generateInviteCode(bubbleId, expiresAt)
      setInviteCode(code)
      return code
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  /** 초대 코드 유효성 검증 (상세 결과) */
  const validateLink = useCallback(async (code: string): Promise<InviteValidation> => {
    setIsLoading(true)
    try {
      return await bubbleRepo.validateInviteCode(code)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /** 클립보드 복사 */
  const copyToClipboard = useCallback(async (code: string): Promise<boolean> => {
    try {
      const url = `${window.location.origin}/bubbles/invite/${code}`
      await navigator.clipboard.writeText(url)
      return true
    } catch {
      return false
    }
  }, [])

  return { inviteCode, generateLink, validateLink, copyToClipboard, isLoading }
}
