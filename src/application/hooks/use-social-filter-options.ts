'use client'

import { useState, useEffect } from 'react'
import { followRepo, bubbleRepo } from '@/shared/di/container'

interface FollowingUser {
  id: string
  nickname: string
  avatarUrl: string | null
}

interface MyBubble {
  id: string
  name: string
  icon: string | null
  iconBgColor: string | null
}

export interface SocialFilterOptions {
  followingUsers: FollowingUser[]
  myBubbles: MyBubble[]
  isLoading: boolean
}

export function useSocialFilterOptions(userId: string | null): SocialFilterOptions {
  const [followingUsers, setFollowingUsers] = useState<FollowingUser[]>([])
  const [myBubbles, setMyBubbles] = useState<MyBubble[]>([])
  const [isLoading, setIsLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    Promise.all([
      followRepo.getFollowingProfiles(userId),
      bubbleRepo.findByUserId(userId),
    ]).then(([profiles, bubbles]) => {
      if (cancelled) return
      setFollowingUsers(profiles)
      setMyBubbles(bubbles.map((b) => ({
        id: b.id,
        name: b.name,
        icon: b.icon,
        iconBgColor: b.iconBgColor,
      })))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })

    return () => { cancelled = true }
  }, [userId])

  return { followingUsers, myBubbles, isLoading }
}
