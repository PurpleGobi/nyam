'use client'

import { useState, useCallback } from 'react'
import type { Bubble, BubbleMember, BubbleShareRule } from '@/domain/entities/bubble'
import { checkJoinEligibility, type JoinApplicantProfile, type JoinEligibility } from '@/domain/services/bubble-join-service'
import { bubbleRepo, notificationRepo } from '@/shared/di/container'

const DEFAULT_SHARE_RULE: BubbleShareRule = { mode: 'all', rules: [], conjunction: 'and' }

export function useBubbleJoin() {
  const [isLoading, setIsLoading] = useState(false)

  /** 가입 신청 (5종 정책별 분기) */
  const requestJoin = useCallback(async (
    bubbleId: string,
    userId: string,
    applicant: JoinApplicantProfile,
    inviteCode?: string,
  ): Promise<{ success: boolean; member?: BubbleMember; eligibility?: JoinEligibility }> => {
    setIsLoading(true)
    try {
      const bubble = await bubbleRepo.findById(bubbleId)
      if (!bubble) return { success: false, eligibility: { eligible: false, reasons: ['버블을 찾을 수 없습니다'] } }

      // invite_only: 초대 코드 검증
      if (bubble.joinPolicy === 'invite_only' && inviteCode) {
        const validation = await bubbleRepo.validateInviteCode(inviteCode)
        if (!validation.valid) {
          const reason = validation.expired ? '만료된 초대 링크입니다' : '유효하지 않은 초대 링크입니다'
          return { success: false, eligibility: { eligible: false, reasons: [reason] } }
        }
      }

      const eligibility = checkJoinEligibility(bubble, applicant, !!inviteCode)
      if (!eligibility.eligible) {
        return { success: false, eligibility }
      }

      // 정책별 status 결정
      const status = bubble.joinPolicy === 'open' || bubble.joinPolicy === 'auto_approve'
        ? 'active'
        : 'pending'

      const member = await bubbleRepo.addMember(bubbleId, userId, 'member', status)

      // active 멤버 → 기본 공유 규칙 설정 (모든 항목 공유)
      if (status === 'active') {
        await bubbleRepo.updateShareRule(bubbleId, userId, DEFAULT_SHARE_RULE)
      }

      // pending 상태 (manual_approve) → 버블 owner에게 가입 요청 알림
      if (status === 'pending' && bubble.createdBy) {
        notificationRepo.createNotification({
          userId: bubble.createdBy,
          type: 'bubble_join_request',
          title: `"${bubble.name}" 버블에 새 가입 신청이 왔어요`,
          body: '승인 또는 거절을 선택해주세요.',
          actionStatus: 'pending',
          actorId: userId,
          targetType: 'bubble',
          targetId: bubbleId,
          bubbleId,
        }).catch(() => {})
      }

      return { success: true, member, eligibility }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /** closed 정책 버블 팔로우 (role='follower', status='active') */
  const follow = useCallback(async (
    bubbleId: string,
    userId: string,
  ): Promise<{ success: boolean; member?: BubbleMember }> => {
    setIsLoading(true)
    try {
      const member = await bubbleRepo.addMember(bubbleId, userId, 'follower', 'active')
      return { success: true, member }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /** owner/admin이 pending 멤버 승인 */
  const approveMember = useCallback(async (bubbleId: string, userId: string): Promise<void> => {
    await bubbleRepo.updateMember(bubbleId, userId, { status: 'active' } as Partial<BubbleMember>)
  }, [])

  /** owner/admin이 pending 멤버 거절 */
  const rejectMember = useCallback(async (bubbleId: string, userId: string): Promise<void> => {
    await bubbleRepo.updateMember(bubbleId, userId, { status: 'rejected' } as Partial<BubbleMember>)
  }, [])

  /** 본인 가입 신청 취소 */
  const cancelJoin = useCallback(async (bubbleId: string, userId: string): Promise<void> => {
    await bubbleRepo.removeMember(bubbleId, userId)
  }, [])

  return { requestJoin, follow, approveMember, rejectMember, cancelJoin, isLoading }
}
