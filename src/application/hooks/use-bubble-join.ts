'use client'

import { useState, useCallback } from 'react'
import type { BubbleMember } from '@/domain/entities/bubble'
import { checkJoinEligibility, type UserJoinProfile } from '@/domain/services/bubble-join-service'
import { bubbleRepo } from '@/shared/di/container'

export function useBubbleJoin() {
  const [isLoading, setIsLoading] = useState(false)

  const requestJoin = useCallback(async (
    bubbleId: string,
    userId: string,
    userProfile: UserJoinProfile,
  ): Promise<{ success: boolean; member?: BubbleMember; reason?: string }> => {
    setIsLoading(true)
    try {
      const bubble = await bubbleRepo.findById(bubbleId)
      if (!bubble) return { success: false, reason: '버블을 찾을 수 없습니다' }

      const eligibility = checkJoinEligibility(bubble, userProfile)
      if (!eligibility.eligible) {
        return { success: false, reason: eligibility.reason ?? undefined }
      }

      const status = bubble.joinPolicy === 'auto_approve' || bubble.joinPolicy === 'open'
        ? 'active'
        : 'pending'

      const member = await bubbleRepo.addMember(bubbleId, userId, 'member', status)
      return { success: true, member }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const approveMember = useCallback(async (bubbleId: string, userId: string): Promise<void> => {
    await bubbleRepo.updateMember(bubbleId, userId, { status: 'active' } as Partial<BubbleMember>)
  }, [])

  const rejectMember = useCallback(async (bubbleId: string, userId: string): Promise<void> => {
    await bubbleRepo.updateMember(bubbleId, userId, { status: 'rejected' } as Partial<BubbleMember>)
  }, [])

  return { requestJoin, approveMember, rejectMember, isLoading }
}
