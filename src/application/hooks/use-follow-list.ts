'use client'

import { useState, useEffect } from 'react'
import type { Follow } from '@/domain/entities/follow'
import { followRepo } from '@/shared/di/container'

interface FollowListResult {
  followers: Follow[]
  following: Follow[]
  counts: { followers: number; following: number }
  isLoading: boolean
}

export function useFollowList(userId: string | null): FollowListResult {
  const [followers, setFollowers] = useState<Follow[]>([])
  const [following, setFollowing] = useState<Follow[]>([])
  const [counts, setCounts] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 })
  const [isLoading, setIsLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return
    Promise.all([
      followRepo.getFollowers(userId),
      followRepo.getFollowing(userId),
      followRepo.getCounts(userId),
    ])
      .then(([f, g, c]) => {
        setFollowers(f)
        setFollowing(g)
        setCounts(c)
      })
      .finally(() => setIsLoading(false))
  }, [userId])

  return { followers, following, counts, isLoading }
}
