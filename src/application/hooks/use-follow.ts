'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AccessLevel } from '@/domain/entities/follow'
import { followRepo } from '@/shared/di/container'
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
