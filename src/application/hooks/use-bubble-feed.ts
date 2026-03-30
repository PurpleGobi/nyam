'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { BubbleContentVisibility, BubbleMemberRole } from '@/domain/entities/bubble'
import type { BubbleFeedItem } from '@/domain/repositories/bubble-repository'
import { bubbleRepo } from '@/shared/di/container'

export type FeedTargetFilter = 'all' | 'restaurant' | 'wine'
export type FeedPeriodFilter = 'all' | 'week' | 'month' | '3months'
export type FeedScoreFilter = 'all' | '90' | '80' | '70'
export type FeedSortType = 'recent' | 'popular' | 'score' | 'member'

export interface FeedFilters {
  targetType: FeedTargetFilter
  period: FeedPeriodFilter
  minScore: FeedScoreFilter
  memberId: string | null
}

export interface FeedShareEnriched {
  id: string
  recordId: string
  bubbleId: string
  sharedBy: string
  sharedAt: string
  authorName?: string
  authorAvatar?: string | null
  authorAvatarColor?: string | null
  authorLevel?: number
  targetName?: string
  targetType?: 'restaurant' | 'wine'
  targetMeta?: string | null
  satisfaction?: number | null
  comment?: string | null
  photoUrls?: string[]
}

const DEFAULT_FILTERS: FeedFilters = {
  targetType: 'all',
  period: 'all',
  minScore: 'all',
  memberId: null,
}

function toEnriched(item: BubbleFeedItem): FeedShareEnriched {
  return {
    id: item.id,
    recordId: item.recordId,
    bubbleId: item.bubbleId,
    sharedBy: item.sharedBy,
    sharedAt: item.sharedAt,
    authorName: item.authorNickname,
    authorAvatar: item.authorAvatar,
    authorAvatarColor: item.authorAvatarColor,
    targetName: item.targetName,
    targetType: item.targetType,
    satisfaction: item.satisfaction,
    comment: item.comment,
  }
}

export function useBubbleFeed(
  bubbleId: string,
  myRole: BubbleMemberRole | null,
  contentVisibility: BubbleContentVisibility,
) {
  const [shares, setShares] = useState<FeedShareEnriched[]>([])
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<FeedSortType>('recent')
  const [isLoading, setIsLoading] = useState(true)

  const fetchShares = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await bubbleRepo.getEnrichedShares(bubbleId, { limit: 50 })
      setShares(result.data.map(toEnriched))
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  useEffect(() => {
    fetchShares()
  }, [fetchShares])

  // content_visibility 필터링 (비멤버)
  const visibilityFiltered = useMemo(() => {
    if (myRole !== null) return shares // 멤버는 전부 보임

    return shares.map((s) => {
      const filtered = { ...s }
      // 비멤버: 사진 숨김
      filtered.photoUrls = []
      // rating_only: 한줄평도 숨김
      if (contentVisibility === 'rating_only') {
        filtered.comment = undefined
      }
      return filtered
    })
  }, [shares, myRole, contentVisibility])

  // 필터 적용
  const filtered = useMemo(() => {
    let result = [...visibilityFiltered]

    if (filters.targetType !== 'all') {
      result = result.filter((s) => s.targetType === filters.targetType)
    }

    if (filters.memberId) {
      result = result.filter((s) => s.sharedBy === filters.memberId)
    }

    if (filters.period !== 'all') {
      const now = Date.now()
      const msMap = { week: 7 * 86400000, month: 30 * 86400000, '3months': 90 * 86400000 }
      const cutoff = now - msMap[filters.period]
      result = result.filter((s) => new Date(s.sharedAt).getTime() >= cutoff)
    }

    if (filters.minScore !== 'all') {
      const min = Number(filters.minScore)
      result = result.filter((s) => (s.satisfaction ?? 0) >= min)
    }

    return result
  }, [visibilityFiltered, filters])

  // 정렬
  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sort) {
      case 'recent':
        return arr.sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime())
      case 'score':
        return arr.sort((a, b) => (b.satisfaction ?? 0) - (a.satisfaction ?? 0))
      case 'member':
        return arr.sort((a, b) => (a.sharedBy ?? '').localeCompare(b.sharedBy ?? ''))
      default:
        return arr
    }
  }, [filtered, sort])

  return {
    shares: sorted,
    filters,
    setFilters,
    sort,
    setSort,
    isLoading,
    refetch: fetchShares,
  }
}
