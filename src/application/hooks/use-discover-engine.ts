"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import type { DiscoverResult, DiscoverResponse } from "@/domain/entities/discover"
import { useAuth } from "@/application/hooks/use-auth"

interface DiscoverFilters {
  area: string | null
  scene: string | null
  genre: string | null
}

interface DiscoverSeed {
  area?: string
  scene?: string
}

interface UseDiscoverEngineReturn {
  results: DiscoverResult[]
  isLoading: boolean
  error: string | null
  filters: DiscoverFilters
  source: "cache" | "realtime" | null
  isSeedActive: boolean
  setArea: (area: string | null) => void
  setScene: (scene: string | null) => void
  setGenre: (genre: string | null) => void
  searchNearby: (lat: number, lng: number, radius?: number) => void
  sendFeedback: (restaurantName: string, kakaoId: string | null, feedback: "good" | "bad") => Promise<void>
  isNearbyMode: boolean
}

function buildQueryKey(filters: DiscoverFilters, nearby: { lat: number; lng: number; radius: number } | null): string | null {
  if (nearby) {
    return `discover-nearby-${nearby.lat}-${nearby.lng}-${nearby.radius}-${filters.scene}-${filters.genre}`
  }
  if (!filters.area && !filters.scene) return null
  return `discover-${filters.area}-${filters.scene}-${filters.genre}`
}

function buildUrl(filters: DiscoverFilters, nearby: { lat: number; lng: number; radius: number } | null): string {
  if (nearby) {
    const params = new URLSearchParams()
    params.set("lat", String(nearby.lat))
    params.set("lng", String(nearby.lng))
    params.set("radius", String(nearby.radius))
    if (filters.scene) params.set("scene", filters.scene)
    if (filters.genre) params.set("genre", filters.genre)
    return `/api/discover/nearby?${params}`
  }

  const params = new URLSearchParams()
  if (filters.area) params.set("area", filters.area)
  if (filters.scene) params.set("scene", filters.scene)
  if (filters.genre) params.set("genre", filters.genre)
  return `/api/discover?${params}`
}

export function useDiscoverEngine(seed?: DiscoverSeed): UseDiscoverEngineReturn {
  const { isAuthenticated } = useAuth()
  const [filters, setFilters] = useState<DiscoverFilters>({
    area: null,
    scene: null,
    genre: null,
  })
  const [nearby, setNearby] = useState<{ lat: number; lng: number; radius: number } | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const interactedRef = useRef(false)

  // Derived state: use seed values until user manually interacts with filters
  const effectiveFilters: DiscoverFilters = useMemo(() => {
    if (!interactedRef.current && seed) {
      return { area: seed.area ?? null, scene: seed.scene ?? null, genre: null }
    }
    return filters
  }, [seed, filters])
  const isSeedActive = !interactedRef.current && seed != null && (seed.area != null || seed.scene != null)

  const queryKey = isAuthenticated ? buildQueryKey(effectiveFilters, nearby) : null

  const { data, error, isLoading } = useSWR<DiscoverResponse>(
    queryKey,
    async () => {
      const url = buildUrl(effectiveFilters, nearby)
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      return res.json()
    },
    { revalidateOnFocus: false, dedupingInterval: 5000 },
  )

  const setArea = useCallback((area: string | null) => {
    interactedRef.current = true
    setNearby(null)
    setFilters((prev) => ({ ...prev, area }))
  }, [])

  const setScene = useCallback((scene: string | null) => {
    interactedRef.current = true
    setFilters((prev) => ({ ...prev, scene }))
  }, [])

  const setGenre = useCallback((genre: string | null) => {
    interactedRef.current = true
    setFilters((prev) => ({ ...prev, genre }))
  }, [])

  const searchNearby = useCallback((lat: number, lng: number, radius = 500) => {
    setNearby({ lat, lng, radius })
  }, [])

  const sendFeedback = useCallback(async (
    restaurantName: string,
    kakaoId: string | null,
    feedback: "good" | "bad",
  ) => {
    setFeedbackError(null)
    try {
      const res = await fetch("/api/discover/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName,
          kakaoId,
          feedback,
          queryContext: {
            area: effectiveFilters.area,
            scene: effectiveFilters.scene,
            genre: effectiveFilters.genre,
          },
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Feedback failed")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setFeedbackError(msg)
    }
  }, [effectiveFilters])

  return {
    results: data?.results ?? [],
    isLoading,
    error: error?.message ?? feedbackError,
    filters: effectiveFilters,
    source: data?.source ?? null,
    isSeedActive,
    setArea,
    setScene,
    setGenre,
    searchNearby,
    sendFeedback,
    isNearbyMode: nearby !== null,
  }
}
