"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import type { DiscoverResult, DiscoverResponse } from "@/domain/entities/discover"
import { useAuth } from "@/application/hooks/use-auth"

interface DiscoverFilters {
  areas: string[]
  scenes: string[]
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
  setAreas: (areas: string[]) => void
  toggleArea: (area: string) => void
  setScenes: (scenes: string[]) => void
  toggleScene: (scene: string) => void
  setGenre: (genre: string | null) => void
  searchNearby: (lat: number, lng: number, radius?: number) => void
  sendFeedback: (restaurantName: string, kakaoId: string | null, feedback: "good" | "bad") => Promise<void>
  isNearbyMode: boolean
  toggleNearby: (lat: number, lng: number) => void
}

function buildQueryKey(filters: DiscoverFilters, nearby: { lat: number; lng: number; radius: number } | null): string | null {
  if (nearby) {
    return `discover-nearby-${nearby.lat}-${nearby.lng}-${nearby.radius}-${filters.scenes.join(",")}-${filters.genre}`
  }
  if (filters.areas.length === 0 && filters.scenes.length === 0) return null
  return `discover-${filters.areas.join(",")}-${filters.scenes.join(",")}-${filters.genre}`
}

function buildUrl(filters: DiscoverFilters, nearby: { lat: number; lng: number; radius: number } | null): string {
  if (nearby) {
    const params = new URLSearchParams()
    params.set("lat", String(nearby.lat))
    params.set("lng", String(nearby.lng))
    params.set("radius", String(nearby.radius))
    if (filters.scenes.length > 0) params.set("scene", filters.scenes.join(","))
    if (filters.genre) params.set("genre", filters.genre)
    return `/api/discover/nearby?${params}`
  }

  const params = new URLSearchParams()
  if (filters.areas.length > 0) params.set("area", filters.areas[0])
  if (filters.scenes.length > 0) params.set("scene", filters.scenes.join(","))
  if (filters.genre) params.set("genre", filters.genre)
  return `/api/discover?${params}`
}

export function useDiscoverEngine(seed?: DiscoverSeed): UseDiscoverEngineReturn {
  const { isAuthenticated } = useAuth()
  const [filters, setFilters] = useState<DiscoverFilters>({
    areas: [],
    scenes: [],
    genre: null,
  })
  const [nearby, setNearby] = useState<{ lat: number; lng: number; radius: number } | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const interactedRef = useRef(false)

  // Derived state: use seed values until user manually interacts with filters
  const effectiveFilters: DiscoverFilters = useMemo(() => {
    if (!interactedRef.current && seed) {
      return {
        areas: seed.area ? [seed.area] : [],
        scenes: seed.scene ? [seed.scene] : [],
        genre: null,
      }
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

  const setAreas = useCallback((areas: string[]) => {
    interactedRef.current = true
    setNearby(null)
    setFilters((prev) => ({ ...prev, areas }))
  }, [])

  const toggleArea = useCallback((area: string) => {
    interactedRef.current = true
    setNearby(null)
    setFilters((prev) => ({
      ...prev,
      areas: prev.areas.includes(area)
        ? prev.areas.filter((a) => a !== area)
        : [...prev.areas, area],
    }))
  }, [])

  const setScenes = useCallback((scenes: string[]) => {
    interactedRef.current = true
    setFilters((prev) => ({ ...prev, scenes }))
  }, [])

  const toggleScene = useCallback((scene: string) => {
    interactedRef.current = true
    setFilters((prev) => ({
      ...prev,
      scenes: prev.scenes.includes(scene)
        ? prev.scenes.filter((s) => s !== scene)
        : [...prev.scenes, scene],
    }))
  }, [])

  const setGenre = useCallback((genre: string | null) => {
    interactedRef.current = true
    setFilters((prev) => ({ ...prev, genre }))
  }, [])

  const searchNearby = useCallback((lat: number, lng: number, radius = 500) => {
    interactedRef.current = true
    setNearby({ lat, lng, radius })
  }, [])

  const toggleNearby = useCallback((lat: number, lng: number) => {
    interactedRef.current = true
    if (nearby) {
      setNearby(null)
    } else {
      setNearby({ lat, lng, radius: 500 })
    }
  }, [nearby])

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
            area: effectiveFilters.areas[0] ?? null,
            scene: effectiveFilters.scenes[0] ?? null,
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
    setAreas,
    toggleArea,
    setScenes,
    toggleScene,
    setGenre,
    searchNearby,
    sendFeedback,
    isNearbyMode: nearby !== null,
    toggleNearby,
  }
}
