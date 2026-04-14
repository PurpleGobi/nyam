'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Follow } from '@/domain/entities/follow'
import { followRepo } from '@/shared/di/container'

interface FollowListResult {
  followers: Follow[]
  following: Follow[]
  mutuals: Follow[]
  counts: { followers: number; following: number; mutual: number }
  isLoading: boolean
  refresh: () => void
}

export function useFollowList(userId: string | null): FollowListResult {
  const [followers, setFollowers] = useState<Follow[]>([])
  const [following, setFollowing] = useState<Follow[]>([])
  const [mutuals, setMutuals] = useState<Follow[]>([])
  const [counts, setCounts] = useState<{ followers: number; following: number; mutual: number }>({ followers: 0, following: 0, mutual: 0 })
  const [isLoading, setIsLoading] = useState(!!userId)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    Promise.all([
      followRepo.getFollowers(userId),
      followRepo.getFollowing(userId),
      followRepo.getMutualFollows(userId),
      followRepo.getCounts(userId),
    ])
      .then(([f, g, m, c]) => {
        if (cancelled) return
        setFollowers(f)
        setFollowing(g)
        setMutuals(m)
        setCounts(c)
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [userId, refreshKey])

  // Realtime 구독
  useEffect(() => {
    if (!userId) return
    const { unsubscribe } = followRepo.subscribeToChanges(userId, refresh)
    return unsubscribe
  }, [userId, refresh])

  return { followers, following, mutuals, counts, isLoading, refresh }
}
