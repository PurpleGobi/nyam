'use client'

import { useState, useCallback } from 'react'
import type { DiscoverCard, DiscoverArea } from '@/domain/entities/discover'
import { discoverRepo } from '@/shared/di/container'

export function useDiscover() {
  const [cards, setCards] = useState<DiscoverCard[]>([])
  const [area, setArea] = useState<DiscoverArea | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const fetchCards = useCallback(async (selectedArea: DiscoverArea | null, pageNum: number = 1) => {
    if (!selectedArea) { setCards([]); return }
    setIsLoading(true)
    try {
      const data = await discoverRepo.getByArea(selectedArea, pageNum, 20)
      if (pageNum === 1) {
        setCards(data)
      } else {
        setCards((prev) => [...prev, ...data])
      }
      setHasMore(data.length === 20)
      setPage(pageNum)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const changeArea = useCallback((newArea: DiscoverArea | null) => {
    setArea(newArea)
    fetchCards(newArea, 1)
  }, [fetchCards])

  const loadMore = useCallback(() => {
    if (!area || isLoading) return
    fetchCards(area, page + 1)
  }, [area, page, isLoading, fetchCards])

  return { cards, area, setArea: changeArea, isLoading, hasMore, loadMore, isEmpty: cards.length === 0 && !isLoading }
}
