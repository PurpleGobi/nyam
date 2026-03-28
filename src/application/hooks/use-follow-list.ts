'use client'

import { useState, useEffect } from 'react'
import type { Follow } from '@/domain/entities/follow'
import { followRepo } from '@/shared/di/container'

interface FollowListResult {
  followers: Follow[]
  following: Follow[]
  mutuals: Follow[]
  counts: { followers: number; following: number; mutual: number }
  isLoading: boolean
}

export function useFollowList(userId: string | null): FollowListResult {
  const [followers, setFollowers] = useState<Follow[]>([])
  const [following, setFollowing] = useState<Follow[]>([])
  const [mutuals, setMutuals] = useState<Follow[]>([])
  const [counts, setCounts] = useState<{ followers: number; following: number; mutual: number }>({ followers: 0, following: 0, mutual: 0 })
  const [isLoading, setIsLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return
    Promise.all([
      followRepo.getFollowers(userId),
      followRepo.getFollowing(userId),
      followRepo.getMutualFollows(userId),
      followRepo.getCounts(userId),
    ])
      .then(([f, g, m, c]) => {
        setFollowers(f)
        setFollowing(g)
        setMutuals(m)
        setCounts(c)
      })
      .finally(() => setIsLoading(false))
  }, [userId])

  return { followers, following, mutuals, counts, isLoading }
}
