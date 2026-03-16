'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import type { CuisineCategory } from '@/domain/entities/restaurant'

export interface UnifiedFilter {
  readonly region: string | null
  readonly cuisineCategory: CuisineCategory | null
  readonly situation: string | null
  readonly partySize: string | null
  readonly budget: string | null
}

interface FilterContextValue {
  readonly filter: UnifiedFilter
  readonly detectedRegion: string | null
  readonly setFilter: <K extends keyof UnifiedFilter>(key: K, value: UnifiedFilter[K]) => void
  readonly resetFilters: () => void
}

const DEFAULT_FILTER: UnifiedFilter = {
  region: null,
  cuisineCategory: null,
  situation: null,
  partySize: null,
  budget: null,
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<UnifiedFilter>(DEFAULT_FILTER)
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null)

  // Detect region from geolocation once
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const res = await fetch(
            `/api/restaurants/geocode?lat=${latitude}&lng=${longitude}`
          )
          if (res.ok) {
            const data = await res.json() as { region: string | null }
            if (data.region) {
              setDetectedRegion(data.region)
              setFilterState(prev => ({
                ...prev,
                region: prev.region ?? data.region,
              }))
            }
          }
        } catch {
          // Non-critical
        }
      },
      () => {}, // Permission denied
      { timeout: 5000, maximumAge: 300000 }
    )
  }, [])

  const setFilter = useCallback(<K extends keyof UnifiedFilter>(key: K, value: UnifiedFilter[K]) => {
    setFilterState(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilterState({ ...DEFAULT_FILTER, region: detectedRegion })
  }, [detectedRegion])

  return (
    <FilterContext value={{ filter, detectedRegion, setFilter, resetFilters }}>
      {children}
    </FilterContext>
  )
}

export function useFilterContext(): FilterContextValue {
  const ctx = useContext(FilterContext)
  if (!ctx) {
    throw new Error('useFilterContext must be used within FilterProvider')
  }
  return ctx
}
