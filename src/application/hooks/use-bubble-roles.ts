'use client'

import { useState, useCallback } from 'react'
import type { BubbleMember, BubbleMemberRole } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export interface UseBubbleRolesReturn {
  changeRole: (userId: string, newRole: BubbleMemberRole) => Promise<void>
  removeMember: (userId: string) => Promise<void>
  transferOwnership: (newOwnerId: string, currentOwnerId: string) => Promise<void>
  approveJoin: (userId: string) => Promise<void>
  rejectJoin: (userId: string) => Promise<void>
  isLoading: boolean
}

export function useBubbleRoles(bubbleId: string): UseBubbleRolesReturn {
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

  const transferOwnership = useCallback(async (newOwnerId: string, currentOwnerId: string): Promise<void> => {
    setIsLoading(true)
    try {
      // 대상이 admin인지 확인 (admin에게만 이전 가능 — AUTH.md §2)
      const target = await bubbleRepo.getMember(bubbleId, newOwnerId)
      if (!target || target.role !== 'admin') {
        throw new Error('소유권은 관리자(admin)에게만 이전할 수 있습니다')
      }
      // 대상 → owner, 현재 owner → admin (원자적 트랜잭션은 서버 RPC로 개선 예정)
      await bubbleRepo.updateMember(bubbleId, newOwnerId, { role: 'owner' } as Partial<BubbleMember>)
      await bubbleRepo.updateMember(bubbleId, currentOwnerId, { role: 'admin' } as Partial<BubbleMember>)
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  const approveJoin = useCallback(async (userId: string): Promise<void> => {
    setIsLoading(true)
    try {
      await bubbleRepo.updateMember(bubbleId, userId, { status: 'active' } as Partial<BubbleMember>)
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  const rejectJoin = useCallback(async (userId: string): Promise<void> => {
    setIsLoading(true)
    try {
      await bubbleRepo.updateMember(bubbleId, userId, { status: 'rejected' } as Partial<BubbleMember>)
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  return { changeRole, removeMember, transferOwnership, approveJoin, rejectJoin, isLoading }
}
