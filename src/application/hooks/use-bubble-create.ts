'use client'

import { useState, useCallback } from 'react'
import type { Bubble, BubbleMember } from '@/domain/entities/bubble'
import type { CreateBubbleInput } from '@/domain/repositories/bubble-repository'
import { bubbleRepo } from '@/shared/di/container'
import { useBonusXp } from '@/application/hooks/use-bonus-xp'

export interface CreateBubbleFormInput {
  name: string                    // 1~20자
  description?: string            // 0~100자
  visibility: 'private' | 'public'
  joinPolicy?: 'closed' | 'manual_approve' | 'auto_approve' | 'open'
  icon?: string                   // lucide 아이콘명
  iconBgColor?: string            // hex
  minRecords?: number
  minLevel?: number
  maxMembers?: number
  createdBy: string
}

export interface CreateBubbleResult {
  bubble: Bubble
  inviteCode: string
}

function expiryToDate(): string {
  return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
}

export function useBubbleCreate() {
  const [isLoading, setIsLoading] = useState(false)
  const { awardBonus } = useBonusXp()

  const createBubble = useCallback(async (input: CreateBubbleFormInput): Promise<CreateBubbleResult> => {
    // 검증
    const trimmedName = input.name.trim()
    if (trimmedName.length < 1 || trimmedName.length > 20) {
      throw new Error('버블 이름은 1~20자여야 합니다')
    }
    if (input.description && input.description.trim().length > 100) {
      throw new Error('버블 설명은 100자 이내여야 합니다')
    }

    // private → invite_only 자동 매핑
    const joinPolicy = input.visibility === 'private'
      ? 'invite_only'
      : (input.joinPolicy ?? 'manual_approve')

    setIsLoading(true)
    try {
      const repoInput: CreateBubbleInput = {
        name: trimmedName,
        description: input.description?.trim(),
        visibility: input.visibility,
        joinPolicy,
        icon: input.icon,
        iconBgColor: input.iconBgColor,
        minRecords: input.minRecords,
        minLevel: input.minLevel,
        maxMembers: input.maxMembers,
        createdBy: input.createdBy,
      }

      const bubble = await bubbleRepo.create(repoInput)

      // 초대 코드 생성 (3일 고정)
      const expiresAt = expiryToDate()
      const inviteCode = await bubbleRepo.generateInviteCode(bubble.id, expiresAt)

      // XP 적립: bonus_first_bubble (+5, 첫 버블 생성 시만)
      await awardBonus(input.createdBy, 'first_bubble')

      return { bubble, inviteCode }
    } finally {
      setIsLoading(false)
    }
  }, [awardBonus])

  /** 버블 생성 직후 owner 멤버 정보 업데이트 (visibilityOverride 등) */
  const updateMemberAfterCreate = useCallback(async (
    bubbleId: string,
    userId: string,
    data: Partial<BubbleMember>,
  ): Promise<void> => {
    await bubbleRepo.updateMember(bubbleId, userId, data)
  }, [])

  /** 버블 부분 업데이트 (아이콘 변경 등) */
  const updateBubble = useCallback(async (
    bubbleId: string,
    data: Partial<Omit<Bubble, 'id'>>,
  ): Promise<void> => {
    await bubbleRepo.update(bubbleId, data)
  }, [])

  return { createBubble, updateMemberAfterCreate, updateBubble, isLoading }
}
