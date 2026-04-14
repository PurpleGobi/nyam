'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AccessLevel } from '@/domain/entities/follow'
import { followRepo, notificationRepo } from '@/shared/di/container'

export function useFollow(userId: string | null, targetUserId: string) {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('none')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId || userId === targetUserId) {
      setAccessLevel(userId === targetUserId ? 'following' : 'none')
      return
    }
    followRepo.getAccessLevel(userId, targetUserId).then(setAccessLevel)
  }, [userId, targetUserId])

  const toggleFollow = useCallback(async () => {
    if (!userId || isLoading) return
    setIsLoading(true)
    try {
      if (accessLevel === 'none') {
        await followRepo.follow(userId, targetUserId)
        setAccessLevel('following')
        await notificationRepo.createNotification({
          userId: targetUserId,
          type: 'follow_request',
          title: '새로운 팔로워가 생겼어요!',
          body: null,
          actionStatus: null,
          actorId: userId,
          targetType: 'user',
          targetId: userId,
          bubbleId: null,
        })
      } else {
        await followRepo.unfollow(userId, targetUserId)
        setAccessLevel('none')
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId, targetUserId, accessLevel, isLoading])

  return { accessLevel, isLoading, toggleFollow }
}
