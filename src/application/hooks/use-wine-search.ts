'use client'

import { useState, useCallback } from 'react'
import type { WineSearchResult } from '@/domain/entities/search'
import { wineRepo } from '@/shared/di/container'

export function useWineSearch(userId: string | null) {
  const [results, setResults] = useState<WineSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!userId || query.length < 2) { setResults([]); return }
    setIsSearching(true)
    try {
      const data = await wineRepo.search(query, userId)
      setResults(data)
    } finally {
      setIsSearching(false)
    }
  }, [userId])

  return { results, isSearching, search }
}
