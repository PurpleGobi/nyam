'use client'

import { useState, useCallback, useMemo } from 'react'
import useSWRInfinite from 'swr/infinite'
import type { DiscoverCard, DiscoverArea } from '@/domain/entities/discover'
import { DISCOVER_AREAS } from '@/domain/entities/discover'
import { discoverRepo } from '@/shared/di/container'

const PAGE_SIZE = 20

function getKey(area: DiscoverArea) {
  return (pageIndex: number, previousPageData: { cards: DiscoverCard[]; total: number } | null) => {
    if (previousPageData && previousPageData.cards.length === 0) return null
    return `discover:${area}:${pageIndex + 1}`
  }
}

async function fetcher(key: string): Promise<{ cards: DiscoverCard[]; total: number }> {
  const [, area, page] = key.split(':')
  return discoverRepo.getByArea(area, Number(page), PAGE_SIZE)
}

interface UseDiscoverOptions {
  preferredAreas?: string[] | null
}

export function useDiscover(options?: UseDiscoverOptions) {
  const defaultArea: DiscoverArea = (options?.preferredAreas?.[0] as DiscoverArea) ?? DISCOVER_AREAS[0]
  const [area, setAreaState] = useState<DiscoverArea>(defaultArea)

  const { data, isLoading, isValidating, setSize } = useSWRInfinite(
    getKey(area),
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000, // 1시간 캐시
    },
  )

  const cards = useMemo(() => {
    if (!data) return []
    return data.flatMap((page) => page.cards)
  }, [data])

  const total = data?.[0]?.total ?? 0
  const hasMore = cards.length < total
  const isEmpty = cards.length === 0 && !isLoading

  const loadMore = useCallback(() => {
    if (!isValidating && hasMore) {
      setSize((s) => s + 1)
    }
  }, [isValidating, hasMore, setSize])

  const changeArea = useCallback((newArea: DiscoverArea) => {
    setAreaState(newArea)
  }, [])

  return { cards, area, setArea: changeArea, isLoading, hasMore, loadMore, isEmpty }
}
