'use client'

import { useState, useCallback } from 'react'
import type { SearchUserResult } from '@/domain/repositories/bubble-repository'
import { bubbleRepo } from '@/shared/di/container'
import { notificationRepo } from '@/shared/di/container'

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

  /** 특정 유저에게 버블 초대 알림 전송 */
  const inviteUser = useCallback(async (
    targetUserId: string,
    inviterUserId: string,
    bubbleName: string,
    inviterNickname: string,
  ) => {
    setIsInviting(true)
    try {
      await notificationRepo.createNotification({
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
    } finally {
      setIsInviting(false)
    }
  }, [bubbleId])

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
    clearSearch,
  }
}
