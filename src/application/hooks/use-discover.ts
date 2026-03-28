'use client'

import { useState, useCallback, useEffect } from 'react'
import type { DiscoverCard, DiscoverArea } from '@/domain/entities/discover'
import { DISCOVER_AREAS } from '@/domain/entities/discover'
import { discoverRepo } from '@/shared/di/container'

const DEFAULT_AREA: DiscoverArea = DISCOVER_AREAS[0]

export function useDiscover() {
  const [cards, setCards] = useState<DiscoverCard[]>([])
  const [area, setArea] = useState<DiscoverArea>(DEFAULT_AREA)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchCards = useCallback(async (selectedArea: DiscoverArea, pageNum: number = 1) => {
    setIsLoading(true)
    try {
      const { cards: data, total: totalCount } = await discoverRepo.getByArea(selectedArea, pageNum, 20)
      setTotal(totalCount)
      if (pageNum === 1) {
        setCards(data)
        setHasMore(data.length < totalCount)
      } else {
        setCards((prev) => {
          const next = [...prev, ...data]
          setHasMore(next.length < totalCount)
          return next
        })
      }
      setPage(pageNum)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const changeArea = useCallback((newArea: DiscoverArea) => {
    setArea(newArea)
    fetchCards(newArea, 1)
  }, [fetchCards])

  const loadMore = useCallback(() => {
    if (isLoading) return
    fetchCards(area, page + 1)
  }, [area, page, isLoading, fetchCards])

  // 초기 로드: 기본 지역으로 데이터 fetch
  useEffect(() => {
    fetchCards(DEFAULT_AREA, 1)
  }, [fetchCards])

  return { cards, area, setArea: changeArea, isLoading, hasMore, loadMore, isEmpty: cards.length === 0 && !isLoading }
}
