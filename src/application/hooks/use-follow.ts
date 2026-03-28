'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AccessLevel } from '@/domain/entities/follow'
import { followRepo, notificationRepo } from '@/shared/di/container'
import { useSocialXp } from '@/application/hooks/use-social-xp'

export function useFollow(userId: string | null, targetUserId: string) {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('none')
  const [isLoading, setIsLoading] = useState(false)
  const { awardSocialXp } = useSocialXp()

  useEffect(() => {
    if (!userId || userId === targetUserId) {
      setAccessLevel(userId === targetUserId ? 'mutual' : 'none')
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
        const isMutual = await followRepo.isMutualFollow(userId, targetUserId)
        setAccessLevel(isMutual ? 'mutual' : 'follow')
        await awardSocialXp(userId, isMutual ? 'mutual' : 'follow')

        if (isMutual) {
          // 맞팔 성립 → 양쪽에 follow_accepted 알림
          await Promise.all([
            notificationRepo.createNotification({
              userId: targetUserId,
              type: 'follow_accepted',
              title: '맞팔로우가 되었어요!',
              body: null,
              actionStatus: null,
              actorId: userId,
              targetType: 'user',
              targetId: userId,
              bubbleId: null,
            }),
            notificationRepo.createNotification({
              userId,
              type: 'follow_accepted',
              title: '맞팔로우가 되었어요!',
              body: null,
              actionStatus: null,
              actorId: targetUserId,
              targetType: 'user',
              targetId: targetUserId,
              bubbleId: null,
            }),
          ])
        } else {
          // 일방 팔로우 → 대상에게 follow_request 알림
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
        }
      } else {
        await followRepo.unfollow(userId, targetUserId)
        setAccessLevel('none')
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId, targetUserId, accessLevel, isLoading, awardSocialXp])

  return { accessLevel, isLoading, toggleFollow }
}
