"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import type { DiscoverResult, DiscoverResponse } from "@/domain/entities/discover"
import { useAuth } from "@/application/hooks/use-auth"

interface DiscoverFilters {
  areas: string[]
  scenes: string[]
  genre: string | null
  query: string | null
}

interface DiscoverSeed {
  area?: string
  scene?: string
}

/** Committed state that triggers SWR fetch */
interface CommittedState {
  filters: DiscoverFilters
  nearby: { lat: number; lng: number; radius: number } | null
  version: number
}

interface UseDiscoverEngineReturn {
  results: DiscoverResult[]
  isLoading: boolean
  error: string | null
  /** Pending filters for UI display (buttons, inputs) */
  filters: DiscoverFilters
  /** Committed filters used for the current/last search */
  committedFilters: DiscoverFilters | null
  source: "cache" | "realtime" | null
  isSeedActive: boolean
  setAreas: (areas: string[]) => void
  toggleArea: (area: string) => void
  setScenes: (scenes: string[]) => void
  toggleScene: (scene: string) => void
  setGenre: (genre: string | null) => void
  setQuery: (query: string | null) => void
  /** Commit current filters and trigger API fetch. Pass overrides for values set in the same handler. */
  search: (overrides?: Partial<DiscoverFilters>) => void
  searchNearby: (lat: number, lng: number, radius?: number) => void
  sendFeedback: (restaurantName: string, kakaoId: string | null, feedback: "good" | "bad") => Promise<void>
  isNearbyMode: boolean
  toggleNearby: (lat: number, lng: number) => void
}

function buildQueryKey(filters: DiscoverFilters, nearby: { lat: number; lng: number; radius: number } | null): string | null {
  if (nearby) {
    return `discover-nearby-${nearby.lat}-${nearby.lng}-${nearby.radius}-${filters.scenes.join(",")}-${filters.genre}-${filters.query}`
  }
  if (filters.areas.length === 0 && filters.scenes.length === 0 && !filters.query) return null
  return `discover-${filters.areas.join(",")}-${filters.scenes.join(",")}-${filters.genre}-${filters.query}`
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
  if (filters.query) params.set("query", filters.query)
  return `/api/discover?${params}`
}

export function useDiscoverEngine(seed?: DiscoverSeed): UseDiscoverEngineReturn {
  const { isAuthenticated } = useAuth()

  // Pending filters (UI state - not yet committed for fetch)
  const [filters, setFilters] = useState<DiscoverFilters>({
    areas: [],
    scenes: [],
    genre: null,
    query: null,
  })
  const [nearby, setNearby] = useState<{ lat: number; lng: number; radius: number } | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const interactedRef = useRef(false)
  const versionRef = useRef(0)

  // Committed state: only this triggers SWR fetch
  const [committed, setCommitted] = useState<CommittedState | null>(null)

  // Derived state: use seed values until user manually interacts with filters
  const effectiveFilters: DiscoverFilters = useMemo(() => {
    if (!interactedRef.current && seed) {
      return {
        areas: seed.area ? [seed.area] : [],
        scenes: seed.scene ? [seed.scene] : [],
        genre: null,
        query: null,
      }
    }
    return filters
  }, [seed, filters])
  const isSeedActive = !interactedRef.current && seed != null && (seed.area != null || seed.scene != null)

  // Auto-commit for seed (first load with records)
  const seedKey = seed ? `${seed.area}-${seed.scene}` : null
  useEffect(() => {
    if (isSeedActive && seed && !committed) {
      versionRef.current += 1
      setCommitted({
        filters: {
          areas: seed.area ? [seed.area] : [],
          scenes: seed.scene ? [seed.scene] : [],
          genre: null,
          query: null,
        },
        nearby: null,
        version: versionRef.current,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey, isSeedActive])

  // SWR key: only from committed state
  const queryKey = useMemo(() => {
    if (!isAuthenticated || !committed) return null
    const base = buildQueryKey(committed.filters, committed.nearby)
    if (!base) return null
    return `${base}-v${committed.version}`
  }, [isAuthenticated, committed])

  const { data, error, isLoading } = useSWR<DiscoverResponse>(
    queryKey,
    async () => {
      if (!committed) throw new Error("unreachable")
      const url = buildUrl(committed.filters, committed.nearby)
      console.log(`%c[Discover] 요청 시작`, "color:#6366f1;font-weight:bold", { url, filters: committed.filters })
      const fetchStart = Date.now()
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const json = await res.json() as DiscoverResponse
      const fetchMs = Date.now() - fetchStart
      logDiscoverResponse(json, fetchMs)
      return json
    },
    { revalidateOnFocus: false, dedupingInterval: 0 },
  )

  // --- search: commit current filters and trigger fetch ---
  const search = useCallback((overrides?: Partial<DiscoverFilters>) => {
    const finalFilters = overrides
      ? { ...effectiveFilters, ...overrides }
      : effectiveFilters
    // Also update pending filters with overrides
    if (overrides) {
      setFilters((prev) => ({ ...prev, ...overrides }))
    }
    versionRef.current += 1
    setCommitted({
      filters: finalFilters,
      nearby,
      version: versionRef.current,
    })
  }, [effectiveFilters, nearby])

  // --- Filter setters (pending only, no auto-fetch) ---

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

  const setQuery = useCallback((query: string | null) => {
    interactedRef.current = true
    setFilters((prev) => ({ ...prev, query }))
  }, [])

  // Genre: pending only (client-side post-filter, no re-fetch)
  const setGenre = useCallback((genre: string | null) => {
    interactedRef.current = true
    setFilters((prev) => ({ ...prev, genre }))
  }, [])

  // Nearby: pending only (no auto-commit, same as area/scene)
  const searchNearby = useCallback((lat: number, lng: number, radius = 1000) => {
    interactedRef.current = true
    setNearby({ lat, lng, radius })
  }, [])

  const toggleNearby = useCallback((lat: number, lng: number) => {
    interactedRef.current = true
    if (nearby) {
      setNearby(null)
    } else {
      setNearby({ lat, lng, radius: 1000 })
    }
  }, [nearby])

  const sendFeedback = useCallback(async (
    restaurantName: string,
    kakaoId: string | null,
    feedback: "good" | "bad",
  ) => {
    setFeedbackError(null)
    const ctx = committed?.filters ?? effectiveFilters
    try {
      const res = await fetch("/api/discover/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName,
          kakaoId,
          feedback,
          queryContext: {
            area: ctx.areas[0] ?? null,
            scene: ctx.scenes[0] ?? null,
            genre: ctx.genre,
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
  }, [committed, effectiveFilters])

  // Client-side genre filtering (no re-fetch needed)
  const filteredResults = useMemo(() => {
    const all = data?.results ?? []
    if (!filters.genre) return all
    return all.filter((r) => r.restaurant.genre === filters.genre)
  }, [data?.results, filters.genre])

  return {
    results: filteredResults,
    isLoading,
    error: error?.message ?? feedbackError,
    filters: effectiveFilters,
    committedFilters: committed?.filters ?? null,
    source: data?.source ?? null,
    isSeedActive,
    setAreas,
    toggleArea,
    setScenes,
    toggleScene,
    setGenre,
    setQuery,
    search,
    searchNearby,
    sendFeedback,
    isNearbyMode: nearby !== null,
    toggleNearby,
  }
}

/** Browser console debug output */
function logDiscoverResponse(res: DiscoverResponse, fetchMs: number): void {
  const d = res.debug
  if (!d) {
    console.log(`%c[Discover] 완료 (${fetchMs}ms) - ${res.results.length}건`, "color:#22c55e;font-weight:bold")
    return
  }

  console.group(`%c[Discover] === 파이프라인 결과 (${fetchMs}ms) ===`, "color:#6366f1;font-weight:bold;font-size:13px")

  // Input context
  if (d.inputContext) {
    console.log(
      `%c[Input] %c${d.inputContext}`,
      "color:#f59e0b;font-weight:bold",
      "color:#e5e7eb",
    )
  }

  // LLM prompt
  if (d.prompt) {
    console.groupCollapsed(`%c[Prompt] LLM 프롬프트 전문 (클릭하여 펼치기)`, "color:#ec4899;font-weight:bold")
    console.log(d.prompt)
    console.groupEnd()
  }

  // Pipeline steps
  for (const step of d.pipeline) {
    const ms = step.durationMs ? `${step.durationMs}ms` : ""
    console.log(
      `%c[Step] %c${step.step} %c${ms}\n%c  -> ${step.detail}`,
      "color:#f59e0b;font-weight:bold",
      "color:#e5e7eb",
      "color:#6b7280",
      "color:#9ca3af",
    )
  }

  // Scoring method
  console.log(
    `%c[Score] %cLLM base (100점) + DNA match bonus (+-${d.blendRatio.dna}점)`,
    "color:#8b5cf6;font-weight:bold",
    "color:#e5e7eb",
  )

  // Scored results table
  if (d.scoredResults.length > 0) {
    console.log(`%c[결과] Top ${d.scoredResults.length}`, "color:#22c55e;font-weight:bold")
    console.table(
      d.scoredResults.map((r) => ({
        순위: r.rank,
        식당명: r.name,
        최종점수: r.blended,
        "LLM점수": r.llmScore,
        "DNA점수": r.dnaScore,
        유형: r.category,
        추천이유: r.reason,
      })),
    )
  }

  // Final results
  if (res.results.length > 0) {
    console.log(`%c[최종 응답]`, "color:#22c55e;font-weight:bold")
    for (const r of res.results) {
      console.log(
        `  #${r.rank} %c${r.restaurant.name}%c (${r.scores.overall}점) - ${r.reason}`,
        "font-weight:bold",
        "font-weight:normal",
      )
      if (r.highlights.length > 0) {
        console.log(`    highlights: ${r.highlights.join(" | ")}`)
      }
    }
  }

  console.groupEnd()
}
