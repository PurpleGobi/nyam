'use client'

import { useState, useCallback } from 'react'
import type { BubbleMember, BubbleMemberRole } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export function useBubbleRoles(bubbleId: string) {
  const [isLoading, setIsLoading] = useState(false)

  const changeRole = useCallback(async (userId: string, newRole: BubbleMemberRole): Promise<void> => {
    setIsLoading(true)
    try {
      await bubbleRepo.updateMember(bubbleId, userId, { role: newRole } as Partial<BubbleMember>)
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  const removeMember = useCallback(async (userId: string): Promise<void> => {
    setIsLoading(true)
    try {
      await bubbleRepo.removeMember(bubbleId, userId)
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  const transferOwnership = useCallback(async (currentOwnerId: string, newOwnerId: string): Promise<void> => {
    setIsLoading(true)
    try {
      await bubbleRepo.updateMember(bubbleId, newOwnerId, { role: 'owner' } as Partial<BubbleMember>)
      await bubbleRepo.updateMember(bubbleId, currentOwnerId, { role: 'admin' } as Partial<BubbleMember>)
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  return { changeRole, removeMember, transferOwnership, isLoading }
}
