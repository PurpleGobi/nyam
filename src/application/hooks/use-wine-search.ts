'use client'

import { useState, useCallback } from 'react'
import type { WineSearchResult } from '@/domain/entities/search'
import type { WineCandidate } from '@/domain/entities/camera'
import { wineRepo } from '@/shared/di/container'

export function useWineSearch(userId: string | null) {
  const [results, setResults] = useState<WineSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [ocrCandidates, setOcrCandidatesState] = useState<WineCandidate[]>([])
  const [selectedWine, setSelectedWine] = useState<WineCandidate | null>(null)

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

  const setOcrCandidates = useCallback((candidates: WineCandidate[]) => {
    setOcrCandidatesState(candidates)
    // 확실한 매칭 (1개 + 0.8 이상) → 자동 선택
    if (candidates.length === 1 && candidates[0].matchScore >= 0.8) {
      setSelectedWine(candidates[0])
    }
  }, [])

  const selectWineCandidate = useCallback((candidate: WineCandidate) => {
    setSelectedWine(candidate)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedWine(null)
    setOcrCandidatesState([])
  }, [])

  // 확인 필요 여부: 후보가 있지만 자동 선택되지 않은 경우
  const needsConfirmation = ocrCandidates.length > 0 && (
    ocrCandidates.length > 1 ||
    (ocrCandidates.length === 1 && ocrCandidates[0].matchScore < 0.8)
  )

  return {
    results,
    isSearching,
    search,
    ocrCandidates,
    selectedWine,
    setOcrCandidates,
    selectWineCandidate,
    clearSelection,
    needsConfirmation,
  }
}
