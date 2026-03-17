"use client"

import { useCallback, useRef, useState } from "react"
import type { NearbyPlace } from "@/infrastructure/api/kakao-local"

export function useRestaurantSearch() {
  const [results, setResults] = useState<NearbyPlace[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const search = useCallback((query: string, lat?: number, lng?: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      const params = new URLSearchParams({ q: query })
      if (lat) params.set("lat", String(lat))
      if (lng) params.set("lng", String(lng))

      const response = await fetch(`/api/restaurants/search?${params}`)
      const data = await response.json()
      setResults(data.places ?? [])
      setIsSearching(false)
    }, 300)
  }, [])

  return { results, isSearching, search }
}
