'use client'

import { useState, useCallback } from 'react'
import type { Bubble } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

/** 초대 링크 만료: 3일 고정 */
const INVITE_EXPIRY_DAYS = 3

export interface InviteValidation {
  valid: boolean
  bubble: Bubble | null
  expired: boolean
}

export function useInviteLink(bubbleId: string) {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  /** 초대 링크 생성 (만료 3일 고정) */
  const generateLink = useCallback(async (): Promise<string> => {
    setIsLoading(true)
    try {
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
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
