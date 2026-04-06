'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BubbleMember } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

interface UseBubbleMemberReturn {
  member: BubbleMember | null
  pendingMembers: BubbleMember[]
  updateMember: (data: Partial<BubbleMember>) => Promise<void>
  refreshPending: () => void
  isLoading: boolean
}

/**
 * 버블 멤버 관리 hook
 * 현재 사용자의 멤버 정보 로드, 가입 대기 멤버 목록, 멤버 정보 업데이트
 */
export function useBubbleMember(bubbleId: string, userId: string | null): UseBubbleMemberReturn {
  const [member, setMember] = useState<BubbleMember | null>(null)
  const [pendingMembers, setPendingMembers] = useState<BubbleMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pendingVersion, setPendingVersion] = useState(0)

  // 현재 멤버 정보 로드
  useEffect(() => {
    if (!userId || !bubbleId) {
      setMember(null)
      return
    }

    let cancelled = false
    setIsLoading(true)

    bubbleRepo.getMember(bubbleId, userId).then((result) => {
      if (!cancelled) {
        setMember(result)
        setIsLoading(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setMember(null)
        setIsLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [bubbleId, userId])

  // 가입 대기 멤버 목록 로드
  useEffect(() => {
    if (!bubbleId) {
      setPendingMembers([])
      return
    }

    let cancelled = false
    bubbleRepo.getPendingMembers(bubbleId).then((pending) => {
      if (!cancelled) {
        setPendingMembers(pending)
      }
    }).catch(() => {
      if (!cancelled) setPendingMembers([])
    })

    return () => { cancelled = true }
  }, [bubbleId, pendingVersion])

  const updateMember = useCallback(async (data: Partial<BubbleMember>) => {
    if (!userId || !bubbleId) return
    await bubbleRepo.updateMember(bubbleId, userId, data)
    // 로컬 상태 반영
    setMember((prev) => prev ? { ...prev, ...data } : prev)
  }, [bubbleId, userId])

  const refreshPending = useCallback(() => {
    setPendingVersion((v) => v + 1)
  }, [])

  return { member, pendingMembers, updateMember, refreshPending, isLoading }
}
