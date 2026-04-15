'use client'

import { useState, useCallback } from 'react'
import type { SearchUserResult } from '@/domain/repositories/bubble-repository'
import type { PendingBubbleInvite } from '@/domain/repositories/notification-repository'
import { bubbleRepo, notificationRepo } from '@/shared/di/container'
import { sendNotification } from '@/application/helpers/send-notification'

export interface InviteResult {
  success: boolean
  /** 중복 초대인 경우 true */
  duplicate: boolean
}

export function useBubbleInviteMember(bubbleId: string) {
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())

  /** 닉네임/핸들로 유저 검색 (이미 멤버인 유저 제외) */
  const searchUsers = useCallback(async (query: string, existingMemberIds: string[]) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const results = await bubbleRepo.searchUsers(query, existingMemberIds, 10)
      setSearchResults(results)
    } finally {
      setIsSearching(false)
    }
  }, [])

  /**
   * 특정 유저에게 버블 초대 알림 전송
   * @param pendingInvites 현재 대기 중인 초대 목록 (중복 체크용)
   */
  const inviteUser = useCallback(async (
    targetUserId: string,
    inviterUserId: string,
    bubbleName: string,
    inviterNickname: string,
    pendingInvites?: PendingBubbleInvite[],
  ): Promise<InviteResult> => {
    // 세션 내 중복 체크
    if (invitedIds.has(targetUserId)) {
      return { success: false, duplicate: true }
    }
    // DB 기반 중복 체크
    if (pendingInvites?.some((inv) => inv.userId === targetUserId)) {
      return { success: false, duplicate: true }
    }

    setIsInviting(true)
    try {
      await sendNotification({
        userId: targetUserId,
        type: 'bubble_invite',
        title: `${inviterNickname}님이 "${bubbleName}" 버블에 초대했어요`,
        body: '수락하면 버블에 가입됩니다.',
        actionStatus: 'pending',
        actorId: inviterUserId,
        targetType: 'bubble',
        targetId: bubbleId,
        bubbleId,
      })
      setInvitedIds((prev) => new Set([...prev, targetUserId]))
      return { success: true, duplicate: false }
    } finally {
      setIsInviting(false)
    }
  }, [bubbleId, invitedIds])

  /** 초대 취소 (pending 알림 삭제) */
  const cancelInvite = useCallback(async (notificationId: string) => {
    await notificationRepo.deleteNotification(notificationId)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchResults([])
  }, [])

  return {
    searchResults,
    isSearching,
    isInviting,
    invitedIds,
    searchUsers,
    inviteUser,
    cancelInvite,
    clearSearch,
  }
}
