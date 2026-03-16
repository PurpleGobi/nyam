'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  searchRestaurants,
  type KakaoPlaceResult,
} from '@/infrastructure/api/kakao-local'

export function useRestaurantSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KakaoPlaceResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selected, setSelected] = useState<KakaoPlaceResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim() || selected) {
      setResults([])
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const places = await searchRestaurants(query)
        setResults(places)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selected])

  const handleSelect = useCallback((place: KakaoPlaceResult) => {
    setSelected(place)
    setResults([])
  }, [])

  const handleClear = useCallback(() => {
    setSelected(null)
    setQuery('')
    setResults([])
  }, [])

  return {
    query,
    setQuery,
    results,
    isSearching,
    selected,
    handleSelect,
    handleClear,
  }
}
