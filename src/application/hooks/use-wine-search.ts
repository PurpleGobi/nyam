'use client'

import { useState, useCallback } from 'react'
import type { WineSearchResult } from '@/domain/entities/search'
import type { WineCandidate } from '@/domain/entities/camera'
import type { WineSearchCandidate } from '@/infrastructure/api/ai-recognition'
import { wineRepo } from '@/shared/di/container'

export function useWineSearch(userId: string | null) {
  const [results, setResults] = useState<WineSearchResult[]>([])
  const [aiCandidates, setAiCandidates] = useState<WineSearchCandidate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAiSearching, setIsAiSearching] = useState(false)
  const [isSelectingWine, setIsSelectingWine] = useState(false)
  const [ocrCandidates, setOcrCandidatesState] = useState<WineCandidate[]>([])
  const [selectedWine, setSelectedWine] = useState<WineCandidate | null>(null)

  // 1차: DB 검색
  const search = useCallback(async (query: string) => {
    if (!userId || query.length < 2) { setResults([]); setAiCandidates([]); return }
    setIsSearching(true)
    try {
      const data = await wineRepo.search(query, userId)
      setResults(data)
    } finally {
      setIsSearching(false)
    }
  }, [userId])

  // 2차: AI 검색 (DB 결과가 부족할 때 호출)
  const searchAI = useCallback(async (query: string) => {
    if (query.length < 2) { setAiCandidates([]); return }
    setIsAiSearching(true)
    try {
      const res = await fetch('/api/wines/search-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (data.success) {
        setAiCandidates(data.candidates)
      }
    } finally {
      setIsAiSearching(false)
    }
  }, [])

  // AI 후보 선택 → 상세 정보 조회 + DB 저장 → WineCandidate로 변환
  const selectAiCandidate = useCallback(async (candidate: WineSearchCandidate) => {
    setIsSelectingWine(true)
    try {
      const res = await fetch('/api/wines/detail-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidate.name,
          producer: candidate.producer,
          vintage: candidate.vintage,
        }),
      })
      const data = await res.json()
      if (data.success && data.wine) {
        const wineCandidate: WineCandidate = {
          wineId: data.wine.id,
          name: data.wine.name,
          producer: candidate.producer,
          vintage: candidate.vintage,
          wineType: candidate.wineType,
          region: candidate.region,
          country: candidate.country,
          matchScore: 1.0,
        }
        setSelectedWine(wineCandidate)
      }
    } finally {
      setIsSelectingWine(false)
    }
  }, [])

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
    setAiCandidates([])
  }, [])

  // 확인 필요 여부: 후보가 있지만 자동 선택되지 않은 경우
  const needsConfirmation = ocrCandidates.length > 0 && (
    ocrCandidates.length > 1 ||
    (ocrCandidates.length === 1 && ocrCandidates[0].matchScore < 0.8)
  )

  return {
    results,
    aiCandidates,
    isSearching,
    isAiSearching,
    isSelectingWine,
    search,
    searchAI,
    selectAiCandidate,
    ocrCandidates,
    selectedWine,
    setOcrCandidates,
    selectWineCandidate,
    clearSelection,
    needsConfirmation,
  }
}
