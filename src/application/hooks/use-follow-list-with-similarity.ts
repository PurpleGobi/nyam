'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { SimilarityResult } from '@/domain/entities/similarity'
import { profileRepo, similarityRepo } from '@/shared/di/container'
import { useFollowList } from '@/application/hooks/use-follow-list'
import { getLevelColor } from '@/domain/services/xp-calculator'

export interface EnrichedFollowUser {
  userId: string
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  level: number
  levelColor: string
  similarity: number | null
  confidence: number | null
}

interface UseFollowListWithSimilarityResult {
  followers: EnrichedFollowUser[]
  following: EnrichedFollowUser[]
  counts: { followers: number; following: number }
  isLoading: boolean
  sortedBy: 'default' | 'similarity'
  setSortedBy: (sort: 'default' | 'similarity') => void
  refresh: () => void
}

async function enrichIds(ids: string[], currentUserId: string): Promise<EnrichedFollowUser[]> {
  if (ids.length === 0) return []

  const [profileResults, similarityResults] = await Promise.allSettled([
    profileRepo.getUserProfiles(ids),
    Promise.allSettled(ids.map((id) => similarityRepo.getSimilarity(currentUserId, id, 'restaurant'))),
  ])

  const profileMap = profileResults.status === 'fulfilled' ? profileResults.value : new Map()
  const simResults = similarityResults.status === 'fulfilled' ? similarityResults.value : []

  return ids
    .map((id, i) => {
      const p = profileMap.get(id)
      if (!p) return null
      const level = Math.max(1, Math.floor(p.totalXp / 100) + 1)
      const simResult = simResults[i]
      const sim: SimilarityResult | null = simResult?.status === 'fulfilled' ? simResult.value : null
      return {
        userId: id,
        nickname: p.nickname,
        handle: p.handle,
        avatarUrl: p.avatarUrl,
        avatarColor: p.avatarColor,
        level,
        levelColor: getLevelColor(level),
        similarity: sim?.similarity ?? null,
        confidence: sim?.confidence ?? null,
      }
    })
    .filter((x): x is EnrichedFollowUser => x !== null)
}

export function useFollowListWithSimilarity(userId: string | null): UseFollowListWithSimilarityResult {
  const { followers, following, counts, isLoading, refresh } = useFollowList(userId)

  const [followerUsers, setFollowerUsers] = useState<EnrichedFollowUser[]>([])
  const [followingUsers, setFollowingUsers] = useState<EnrichedFollowUser[]>([])
  const [enriching, setEnriching] = useState(false)
  const [sortedBy, setSortedBy] = useState<'default' | 'similarity'>('default')
  const cancelRef = useRef(false)

  useEffect(() => {
    if (isLoading || !userId) return
    cancelRef.current = false

    const followerIds = followers.map((f) => f.followerId)
    const followingIds = following.map((f) => f.followingId)
    if (followerIds.length + followingIds.length === 0) return

    void Promise.resolve().then(() => { if (!cancelRef.current) setEnriching(true) })

    Promise.all([enrichIds(followerIds, userId), enrichIds(followingIds, userId)])
      .then(([fUsers, gUsers]) => {
        if (!cancelRef.current) {
          setFollowerUsers(fUsers)
          setFollowingUsers(gUsers)
        }
      })
      .finally(() => { if (!cancelRef.current) setEnriching(false) })

    return () => { cancelRef.current = true }
  }, [isLoading, followers, following, userId])

  const sortedFollowers = useMemo(() => {
    if (sortedBy !== 'similarity') return followerUsers
    return [...followerUsers].sort((a, b) => (b.similarity ?? -1) - (a.similarity ?? -1))
  }, [followerUsers, sortedBy])

  const sortedFollowing = useMemo(() => {
    if (sortedBy !== 'similarity') return followingUsers
    return [...followingUsers].sort((a, b) => (b.similarity ?? -1) - (a.similarity ?? -1))
  }, [followingUsers, sortedBy])

  return {
    followers: sortedFollowers,
    following: sortedFollowing,
    counts: { followers: counts.followers, following: counts.following },
    isLoading: isLoading || enriching,
    sortedBy,
    setSortedBy,
    refresh,
  }
}
