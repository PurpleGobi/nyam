'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BubbleShare } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export type FeedSortType = 'recent' | 'popular'

export function useBubbleFeed(bubbleId: string) {
  const [shares, setShares] = useState<BubbleShare[]>([])
  const [sort, setSort] = useState<FeedSortType>('recent')
  const [isLoading, setIsLoading] = useState(true)

  const fetchShares = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await bubbleRepo.getShares(bubbleId, 50)
      setShares(data)
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  useEffect(() => {
    fetchShares()
  }, [fetchShares])

  const sortedShares = sort === 'recent'
    ? [...shares].sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime())
    : shares

  return { shares: sortedShares, sort, setSort, isLoading, refetch: fetchShares }
}
