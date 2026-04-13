'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { SearchResult, SearchScreenState, RecentSearch } from '@/domain/entities/search'
import type { WineSearchCandidate } from '@/infrastructure/api/ai-recognition'
import { debounce } from '@/shared/utils/debounce'

const DEBOUNCE_MS = 150
const MIN_QUERY_LENGTH = 1
const MAX_RECENT_SEARCHES = 10
const RECENT_SEARCHES_KEY = 'nyam_recent_searches'

interface UseSearchParams {
  targetType: 'restaurant' | 'wine'
  lat?: number | null
  lng?: number | null
  initialQuery?: string
}

export function useSearch({ targetType, lat, lng, initialQuery }: UseSearchParams) {
  const [query, setQueryState] = useState(initialQuery ?? '')
  const [screenState, setScreenState] = useState<SearchScreenState>('idle')
  const [results, setResults] = useState<SearchResult[]>([])
  const [aiCandidates, setAiCandidates] = useState<WineSearchCandidate[]>([])
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAiSearching, setIsAiSearching] = useState(false)
  const [isSelectingAi, setIsSelectingAi] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const aiAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        const all: RecentSearch[] = JSON.parse(stored)
        setRecentSearches(all.filter((s) => s.targetType === targetType))
      }
    } catch {
      // ignore
    }
  }, [targetType])

  const executeSearch = useCallback(
    async (q: string) => {
      if (q.length < MIN_QUERY_LENGTH) {
        setScreenState('idle')
        setResults([])
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsSearching(true)
      setScreenState('searching')

      try {
        let endpoint =
          targetType === 'restaurant'
            ? `/api/restaurants/search?q=${encodeURIComponent(q)}`
            : `/api/wines/search?q=${encodeURIComponent(q)}`

        if (targetType === 'restaurant' && lat != null && lng != null) {
          endpoint += `&lat=${lat}&lng=${lng}`
        }

        const response = await fetch(endpoint, { signal: controller.signal })
        const data = await response.json()
        const searchResults: SearchResult[] = data.results ?? []

        setResults(searchResults)

        // 와인 검색: DB 결과가 3개 미만이면 AI 검색 자동 트리거
        if (targetType === 'wine' && searchResults.length < 3) {
          setScreenState(searchResults.length > 0 ? 'results' : 'searching')
          setIsAiSearching(true)
          aiAbortRef.current?.abort()
          const aiController = new AbortController()
          aiAbortRef.current = aiController
          try {
            const aiRes = await fetch('/api/wines/search-ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: q }),
              signal: aiController.signal,
            })
            const aiData = await aiRes.json()
            if (aiData.success) {
              setAiCandidates(aiData.candidates ?? [])
            }
          } catch (aiErr) {
            if (aiErr instanceof DOMException && aiErr.name === 'AbortError') return
          } finally {
            setIsAiSearching(false)
          }
          // AI 결과까지 합쳐서 최종 상태 결정
          setScreenState(searchResults.length > 0 ? 'results' : 'results')
        } else {
          setAiCandidates([])
          setScreenState(searchResults.length === 0 ? 'empty' : 'results')
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setScreenState('empty')
        setResults([])
        setAiCandidates([])
      } finally {
        setIsSearching(false)
      }
    },
    [targetType, lat, lng],
  )

  const debouncedSearch = useMemo(
    () => debounce((q: string) => executeSearch(q), DEBOUNCE_MS),
    [executeSearch],
  )

  // initialQuery가 있으면 마운트 시 자동 검색
  const initialSearchDone = useRef(false)
  useEffect(() => {
    if (initialQuery && initialQuery.length >= MIN_QUERY_LENGTH && !initialSearchDone.current) {
      initialSearchDone.current = true
      executeSearch(initialQuery)
    }
  }, [initialQuery, executeSearch])

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q)
      if (q.length === 0) {
        setScreenState('idle')
        setResults([])
        setAiCandidates([])
      } else if (q.length < MIN_QUERY_LENGTH) {
        setScreenState('idle')
        setResults([])
        setAiCandidates([])
      } else {
        setScreenState('typing')
        debouncedSearch(q)
      }
    },
    [debouncedSearch],
  )

  const addRecentSearch = useCallback(
    (q: string) => {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
        const all: RecentSearch[] = stored ? JSON.parse(stored) : []
        const filtered = all.filter((s) => !(s.query === q && s.targetType === targetType))
        const updated = [{ query: q, targetType, timestamp: Date.now() }, ...filtered].slice(
          0,
          MAX_RECENT_SEARCHES,
        )
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
        setRecentSearches(updated.filter((s) => s.targetType === targetType))
      } catch {
        // ignore
      }
    },
    [targetType],
  )

  const clearRecentSearches = useCallback(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      const all: RecentSearch[] = stored ? JSON.parse(stored) : []
      const filtered = all.filter((s) => s.targetType !== targetType)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered))
      setRecentSearches([])
    } catch {
      // ignore
    }
  }, [targetType])

  // AI 후보 선택 → 상세 조회 + DB 저장 → 기록 가능한 wine 반환
  const selectAiCandidate = useCallback(
    async (candidate: WineSearchCandidate): Promise<{ id: string; name: string } | null> => {
      setIsSelectingAi(true)
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
          return { id: data.wine.id, name: data.wine.name }
        }
        return null
      } finally {
        setIsSelectingAi(false)
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setQueryState('')
    setScreenState('idle')
    setResults([])
    setAiCandidates([])
    setIsSearching(false)
    setIsAiSearching(false)
    abortRef.current?.abort()
    aiAbortRef.current?.abort()
  }, [])

  return {
    query,
    setQuery,
    screenState,
    results,
    aiCandidates,
    isSearching,
    isAiSearching,
    isSelectingAi,
    selectAiCandidate,
    recentSearches,
    executeSearch,
    addRecentSearch,
    clearRecentSearches,
    reset,
  }
}
