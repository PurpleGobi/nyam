'use client'

import { useState, useEffect, useCallback } from 'react'
import { bubbleRepo, followRepo } from '@/shared/di/container'

interface FeedItem {
  id: string
  recordId: string
  targetName: string
  targetType: 'restaurant' | 'wine'
  satisfaction: number | null
  comment: string | null
  visitDate: string | null
  sourceType: 'bubble' | 'user'
  sourceName: string
  sourceIcon: string | null
  sourceAvatar: string | null
  sourceAvatarColor: string | null
  authorNickname: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  createdAt: string
}

type SourceFilter = 'all' | 'bubble' | 'mutual'

interface UseFollowingFeedResult {
  items: FeedItem[]
  isLoading: boolean
  refresh: () => void
  sourceFilter: SourceFilter
  setSourceFilter: (f: SourceFilter) => void
}

export function useFollowingFeed(userId: string | null): UseFollowingFeedResult {
  const [allItems, setAllItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  const fetch = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [bubbleShares, mutualFollows] = await Promise.all([
        bubbleRepo.getFeedFromBubbles(userId),
        followRepo.getFollowing(userId),
      ])

      const bubbleFeedItems: FeedItem[] = bubbleShares.map((s) => ({
        id: `bubble-${s.id}`,
        recordId: s.recordId,
        targetName: s.targetName ?? '',
        targetType: s.targetType ?? 'restaurant',
        satisfaction: s.satisfaction ?? null,
        comment: s.comment ?? null,
        visitDate: s.visitDate ?? null,
        sourceType: 'bubble' as const,
        sourceName: s.bubbleName ?? '',
        sourceIcon: s.bubbleIcon ?? null,
        sourceAvatar: null,
        sourceAvatarColor: null,
        authorNickname: s.authorNickname ?? '',
        authorAvatar: s.authorAvatar ?? null,
        authorAvatarColor: s.authorAvatarColor ?? null,
        createdAt: s.sharedAt,
      }))

      const mutualUserIds = mutualFollows.map((f) => f.followingId)
      let mutualFeedItems: FeedItem[] = []
      if (mutualUserIds.length > 0) {
        const mutualRecords = await bubbleRepo.getRecentRecordsByUsers(mutualUserIds)
        mutualFeedItems = mutualRecords.map((r) => ({
          id: `mutual-${r.recordId}`,
          recordId: r.recordId,
          targetName: r.targetName ?? '',
          targetType: r.targetType ?? 'restaurant',
          satisfaction: r.satisfaction ?? null,
          comment: r.comment ?? null,
          visitDate: r.visitDate ?? null,
          sourceType: 'user' as const,
          sourceName: r.authorNickname ?? '',
          sourceIcon: null,
          sourceAvatar: r.authorAvatar ?? null,
          sourceAvatarColor: r.authorAvatarColor ?? null,
          authorNickname: r.authorNickname ?? '',
          authorAvatar: r.authorAvatar ?? null,
          authorAvatarColor: r.authorAvatarColor ?? null,
          createdAt: r.createdAt,
        }))
      }

      const merged = [...bubbleFeedItems, ...mutualFeedItems]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setAllItems(merged)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const items = sourceFilter === 'all'
    ? allItems
    : allItems.filter((item) => (sourceFilter === 'bubble' ? item.sourceType === 'bubble' : item.sourceType === 'user'))

  return { items, isLoading, refresh: fetch, sourceFilter, setSourceFilter }
}
