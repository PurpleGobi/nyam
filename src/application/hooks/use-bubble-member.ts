'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import type { BubbleMember } from '@/domain/entities/bubble'
import type { PendingBubbleInvite } from '@/domain/repositories/notification-repository'
import { bubbleRepo, notificationRepo } from '@/shared/di/container'

interface UseBubbleMemberReturn {
  member: BubbleMember | null
  pendingMembers: BubbleMember[]
  pendingInvites: PendingBubbleInvite[]
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
  const [pendingInvites, setPendingInvites] = useState<PendingBubbleInvite[]>([])
  const [isPending, startTransition] = useTransition()
  const [pendingVersion, setPendingVersion] = useState(0)

  // 현재 멤버 정보 로드
  useEffect(() => {
    if (!userId || !bubbleId) return

    let cancelled = false
    startTransition(async () => {
      try {
        const result = await bubbleRepo.getMember(bubbleId, userId)
        if (!cancelled) setMember(result)
      } catch {
        if (!cancelled) setMember(null)
      }
    })

    return () => { cancelled = true }
  }, [bubbleId, userId, startTransition])

  // 가입 대기 멤버 + 초대 수락 대기 목록 로드
  useEffect(() => {
    if (!bubbleId) return

    let cancelled = false
    startTransition(async () => {
      try {
        const [pending, invites] = await Promise.all([
          bubbleRepo.getPendingMembers(bubbleId),
          notificationRepo.getPendingBubbleInvites(bubbleId).catch(() => [] as PendingBubbleInvite[]),
        ])
        if (!cancelled) {
          setPendingMembers(pending)
          setPendingInvites(invites)
        }
      } catch {
        if (!cancelled) {
          setPendingMembers([])
          setPendingInvites([])
        }
      }
    })

    return () => { cancelled = true }
  }, [bubbleId, pendingVersion, startTransition])

  const updateMember = useCallback(async (data: Partial<BubbleMember>) => {
    if (!userId || !bubbleId) return
    await bubbleRepo.updateMember(bubbleId, userId, data)
    // 로컬 상태 반영
    setMember((prev) => prev ? { ...prev, ...data } : prev)
  }, [bubbleId, userId])

  const refreshPending = useCallback(() => {
    setPendingVersion((v) => v + 1)
  }, [])

  return { member, pendingMembers, pendingInvites, updateMember, refreshPending, isLoading: isPending }
}
