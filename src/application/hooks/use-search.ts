'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { SearchResult, SearchScreenState, RecentSearch } from '@/domain/entities/search'
import { debounce } from '@/shared/utils/debounce'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2
const MAX_RECENT_SEARCHES = 10
const RECENT_SEARCHES_KEY = 'nyam_recent_searches'

interface UseSearchParams {
  targetType: 'restaurant' | 'wine'
}

export function useSearch({ targetType }: UseSearchParams) {
  const [query, setQueryState] = useState('')
  const [screenState, setScreenState] = useState<SearchScreenState>('idle')
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

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
        const endpoint =
          targetType === 'restaurant'
            ? `/api/restaurants/search?q=${encodeURIComponent(q)}`
            : `/api/wines/search?q=${encodeURIComponent(q)}`

        const response = await fetch(endpoint, { signal: controller.signal })
        const data = await response.json()
        const searchResults: SearchResult[] = data.results ?? []

        if (searchResults.length === 0) {
          setScreenState('empty')
        } else {
          setScreenState('results')
        }
        setResults(searchResults)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setScreenState('empty')
        setResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [targetType],
  )

  const debouncedSearch = useMemo(
    () => debounce((q: string) => executeSearch(q), DEBOUNCE_MS),
    [executeSearch],
  )

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q)
      if (q.length === 0) {
        setScreenState('idle')
        setResults([])
      } else if (q.length >= MIN_QUERY_LENGTH) {
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

  const reset = useCallback(() => {
    setQueryState('')
    setScreenState('idle')
    setResults([])
    setIsSearching(false)
    abortRef.current?.abort()
  }, [])

  return {
    query,
    setQuery,
    screenState,
    results,
    recentSearches,
    isSearching,
    executeSearch,
    addRecentSearch,
    clearRecentSearches,
    reset,
  }
}
