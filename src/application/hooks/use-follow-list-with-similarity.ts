'use client'

// src/application/hooks/use-follow-list-with-similarity.ts
// R3: domain 인터페이스에만 의존. infrastructure 직접 사용 금지.

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
  // CF 적합도
  similarity: number | null       // 0~1
  confidence: number | null       // 0~1
}

interface UseFollowListWithSimilarityResult {
  followers: EnrichedFollowUser[]
  following: EnrichedFollowUser[]
  counts: { followers: number; following: number }
  isLoading: boolean
  // 정렬 옵션
  sortedBy: 'default' | 'similarity'
  setSortedBy: (sort: 'default' | 'similarity') => void
}

async function enrichIds(
  ids: string[],
  currentUserId: string,
): Promise<EnrichedFollowUser[]> {
  // 1. 프로필 enrichment
  const profileResults = await Promise.allSettled(
    ids.map((id) => profileRepo.getUserProfile(id)),
  )

  // 2. 적합도 배치 조회 (restaurant 기준)
  const similarityResults = await Promise.allSettled(
    ids.map((id) => similarityRepo.getSimilarity(currentUserId, id, 'restaurant')),
  )

  return ids
    .map((id, i) => {
      const profileResult = profileResults[i]
      if (profileResult.status !== 'fulfilled') return null
      const p = profileResult.value
      const level = Math.max(1, Math.floor(p.totalXp / 100) + 1)

      const simResult = similarityResults[i]
      const sim: SimilarityResult | null =
        simResult.status === 'fulfilled' ? simResult.value : null

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

export function useFollowListWithSimilarity(
  userId: string | null,
): UseFollowListWithSimilarityResult {
  const { followers, following, counts, isLoading } = useFollowList(userId)

  const [followerUsers, setFollowerUsers] = useState<EnrichedFollowUser[]>([])
  const [followingUsers, setFollowingUsers] = useState<EnrichedFollowUser[]>([])
  const [enrichDone, setEnrichDone] = useState(false)
  const [sortedBy, setSortedBy] = useState<'default' | 'similarity'>('default')
  const cancelRef = useRef(false)

  useEffect(() => {
    if (isLoading || !userId) return

    cancelRef.current = false

    const followerIds = followers.map((f) => f.followerId)
    const followingIds = following.map((f) => f.followingId)

    Promise.all([enrichIds(followerIds, userId), enrichIds(followingIds, userId)])
      .then(([fUsers, gUsers]) => {
        if (!cancelRef.current) {
          setFollowerUsers(fUsers)
          setFollowingUsers(gUsers)
          setEnrichDone(true)
        }
      })
      .catch(() => {
        if (!cancelRef.current) {
          setEnrichDone(true)
        }
      })

    return () => { cancelRef.current = true }
  }, [isLoading, followers, following, userId])

  // 정렬 적용
  const sortedFollowers = useMemo(() => {
    if (sortedBy !== 'similarity') return followerUsers
    return [...followerUsers].sort((a, b) => (b.similarity ?? -1) - (a.similarity ?? -1))
  }, [followerUsers, sortedBy])

  const sortedFollowing = useMemo(() => {
    if (sortedBy !== 'similarity') return followingUsers
    return [...followingUsers].sort((a, b) => (b.similarity ?? -1) - (a.similarity ?? -1))
  }, [followingUsers, sortedBy])

  // enrichment 진행 중 = followList 로드 완료 && enrichDone 아직 false
  const enriching = !isLoading && !!userId && !enrichDone

  return {
    followers: sortedFollowers,
    following: sortedFollowing,
    counts: { followers: counts.followers, following: counts.following },
    isLoading: isLoading || enriching,
    sortedBy,
    setSortedBy,
  }
}
