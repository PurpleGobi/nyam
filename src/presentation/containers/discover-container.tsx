"use client"

import { useCallback, useMemo, useState } from "react"

import { Compass, MapPin, Loader2, Search } from "lucide-react"
import { useDiscoverEngine } from "@/application/hooks/use-discover-engine"
import { useDiscoverOnboarding } from "@/application/hooks/use-discover-onboarding"
import type { OnboardingSelections } from "@/application/hooks/use-discover-onboarding"
import { useGeolocation } from "@/application/hooks/use-geolocation"
import { DiscoverOnboarding } from "@/presentation/components/discover/discover-onboarding"
import { DiscoverResultCard } from "@/presentation/components/discover/discover-result-card"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"
import { RESTAURANT_SCENES } from "@/shared/constants/scenes"
import { cn } from "@/shared/utils/cn"

/** Top areas for quick selection */
const QUICK_AREAS = [
  "강남역", "성수동", "홍대/합정", "이태원/경리단길", "을지로",
  "잠실/송파", "여의도", "종로/광화문", "연남동", "청담/압구정",
] as const

type ViewState = "loading" | "onboarding" | "search" | "results"

export function DiscoverContainer() {
  const {
    needsOnboarding,
    recordCount,
    seedFromRecords,
    completeOnboarding,
    skipOnboarding,
    isSaving,
  } = useDiscoverOnboarding()

  // Compute seed for discover engine (section 8-3)
  const seed = useMemo(() => {
    if (needsOnboarding === false && recordCount != null && recordCount > 0 && seedFromRecords) {
      return { area: seedFromRecords.areas[0], scene: seedFromRecords.scenes[0] }
    }
    return undefined
  }, [needsOnboarding, recordCount, seedFromRecords])

  const {
    results,
    isLoading,
    error,
    filters,
    setArea,
    setScene,
    setGenre,
    searchNearby,
    sendFeedback,
    isNearbyMode,
    isSeedActive,
  } = useDiscoverEngine(seed)

  const { location, loading: geoLoading, requestLocation } = useGeolocation()
  const [manualView, setManualView] = useState<ViewState | null>(null)
  const [queryText, setQueryText] = useState("")

  const viewState: ViewState = (() => {
    if (manualView) return manualView
    if (needsOnboarding === null) return "loading"
    if (needsOnboarding) return "onboarding"
    if (isSeedActive) return "results"
    return "search"
  })()

  // --- Handlers ---
  const handleOnboardingComplete = useCallback(async (selections: OnboardingSelections) => {
    await completeOnboarding(selections)
    const firstArea = selections.areas[0] ?? null
    const firstScene = selections.scenes[0] ?? null
    if (firstArea) setArea(firstArea)
    if (firstScene) setScene(firstScene)
    setManualView("results")
  }, [completeOnboarding, setArea, setScene])

  const handleOnboardingSkip = useCallback(async () => {
    await skipOnboarding()
    setManualView("search")
  }, [skipOnboarding])

  const handleAreaSelect = useCallback((area: string) => {
    const newArea = filters.area === area ? null : area
    setArea(newArea)
  }, [filters.area, setArea])

  const handleSceneSelect = useCallback((scene: string) => {
    const newScene = filters.scene === scene ? null : scene
    setScene(newScene)
  }, [filters.scene, setScene])

  const handleGenreSelect = useCallback((genre: string) => {
    setGenre(filters.genre === genre ? null : genre)
  }, [filters.genre, setGenre])

  const handleNearby = useCallback(() => {
    if (location) {
      searchNearby(location.lat, location.lng)
      setManualView("results")
    } else {
      requestLocation()
    }
  }, [location, searchNearby, requestLocation])

  const handleSearch = useCallback(() => {
    if (filters.area || filters.scene || isNearbyMode) {
      setManualView("results")
    }
  }, [filters.area, filters.scene, isNearbyMode])

  const [isParsing, setIsParsing] = useState(false)

  const handleQueryTextSubmit = useCallback(async () => {
    const trimmed = queryText.trim()
    if (!trimmed) return

    setIsParsing(true)
    try {
      const res = await fetch("/api/discover/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      })

      if (!res.ok) {
        // Fallback: use raw text as area
        setArea(trimmed)
        setManualView("results")
        return
      }

      const { parsed } = await res.json() as {
        parsed: { area: string | null; scene: string | null; genre: string | null }
      }

      if (parsed.area) setArea(parsed.area)
      if (parsed.scene) setScene(parsed.scene)
      if (parsed.genre) setGenre(parsed.genre)

      // No area parsed → use GPS location for nearby search
      if (!parsed.area && location) {
        searchNearby(location.lat, location.lng)
      } else if (!parsed.area && !location) {
        // No area + no GPS → request location, or use seed area as last resort
        if (seed?.area) {
          setArea(seed.area)
        } else {
          requestLocation()
        }
      }

      // If nothing at all was parsed, use raw text as area
      if (!parsed.area && !parsed.scene && !parsed.genre) {
        setArea(trimmed)
      }

      setManualView("results")
    } catch {
      // Network error fallback
      setArea(trimmed)
      setManualView("results")
    } finally {
      setIsParsing(false)
    }
  }, [queryText, setArea, setScene, setGenre, location, searchNearby, requestLocation, seed])

  const handleBackToSearch = useCallback(() => {
    setManualView("search")
  }, [])

  const handleFeedback = useCallback((restaurantName: string, kakaoId: string | null) => {
    return (feedback: "good" | "bad") => {
      sendFeedback(restaurantName, kakaoId, feedback)
    }
  }, [sendFeedback])

  // --- Render ---

  // Loading state
  if (viewState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    )
  }

  // Onboarding (section 3-6)
  if (viewState === "onboarding") {
    return (
      <DiscoverOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        isSaving={isSaving}
      />
    )
  }

  // Search entry screen (section 3-2)
  if (viewState === "search") {
    return (
      <div className="flex flex-col gap-5 px-4 pt-6 pb-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-neutral-800">지금 뭐 먹고 싶어요?</h1>
          <p className="mt-1 text-sm text-neutral-500">상황과 지역을 선택하거나 자유롭게 입력하세요</p>
        </div>

        {/* Natural language input bar (section 3-2) */}
        <div className="relative">
          {isParsing ? (
            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-500 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          )}
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleQueryTextSubmit() }}
            disabled={isParsing}
            placeholder="점심 아무거나, 강남 파스타, 비 오는 날 따뜻한 거..."
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-10 pr-4 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300 transition-colors disabled:opacity-60"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-neutral-100" />
          <span className="text-xs text-neutral-400">또는 빠르게 선택</span>
          <div className="h-px flex-1 bg-neutral-100" />
        </div>

        {/* Scene filters */}
        <div>
          <p className="mb-2 text-xs font-semibold text-neutral-500">누구랑?</p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {RESTAURANT_SCENES.map((scene) => (
              <button
                key={scene.value}
                type="button"
                onClick={() => handleSceneSelect(scene.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filters.scene === scene.value
                    ? "bg-primary-500 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
                )}
              >
                {scene.label}
              </button>
            ))}
          </div>
        </div>

        {/* Area filters */}
        <div>
          <p className="mb-2 text-xs font-semibold text-neutral-500">어디서?</p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            <button
              type="button"
              onClick={handleNearby}
              disabled={geoLoading}
              className={cn(
                "shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                isNearbyMode
                  ? "bg-blue-500 text-white"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100",
              )}
            >
              {geoLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <MapPin className="h-3 w-3" />
              )}
              내 주변
            </button>
            {QUICK_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => handleAreaSelect(area)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filters.area === area
                    ? "bg-blue-500 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
                )}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* Search button */}
        {(filters.area || filters.scene || isNearbyMode) && (
          <button
            type="button"
            onClick={handleSearch}
            className="mt-2 w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 active:scale-[0.98] transition-all"
          >
            추천 받기
          </button>
        )}
      </div>
    )
  }

  // Results screen (section 3-5)
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-800">
          {isNearbyMode
            ? "내 주변"
            : `${filters.area ?? ""} ${filters.scene ?? ""}`.trim() || "추천 결과"}
        </h1>
        <button
          type="button"
          onClick={handleBackToSearch}
          className="text-xs text-primary-500 font-medium hover:text-primary-600"
        >
          다시 검색
        </button>
      </div>

      {/* Filter chips (current filters) */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {RESTAURANT_SCENES.map((scene) => (
          <button
            key={scene.value}
            type="button"
            onClick={() => handleSceneSelect(scene.value)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              filters.scene === scene.value
                ? "bg-primary-500 text-white"
                : "bg-neutral-100 text-neutral-500",
            )}
          >
            {scene.label}
          </button>
        ))}
      </div>

      {/* Genre post-filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <button
          type="button"
          onClick={() => setGenre(null)}
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
            filters.genre === null
              ? "bg-neutral-800 text-white"
              : "bg-neutral-100 text-neutral-500",
          )}
        >
          전체
        </button>
        {FOOD_CATEGORIES.slice(0, 12).map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => handleGenreSelect(cat.value)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              filters.genre === cat.value
                ? "bg-neutral-800 text-white"
                : "bg-neutral-100 text-neutral-500",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results list */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {/* Skeleton cards (section 8-3) */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white shadow-[var(--shadow-sm)] p-4">
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-neutral-200" />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded bg-neutral-200" />
                  <div className="mt-2 h-3 w-48 rounded bg-neutral-100" />
                </div>
                <div className="h-5 w-8 rounded bg-neutral-200" />
              </div>
              <div className="mt-3 flex gap-2">
                <div className="h-3 w-16 rounded bg-neutral-100" />
                <div className="h-3 w-20 rounded bg-neutral-100" />
              </div>
            </div>
          ))}
          <p className="text-center text-sm text-neutral-500">
            {recordCount === 0
              ? "맞집을 찾고 있어요..."
              : "취향 분석 중..."}
          </p>
        </div>
      ) : error ? (
        <EmptyState
          icon={Compass}
          title="검색에 실패했어요"
          description={error}
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="결과가 없어요"
          description="다른 조건으로 검색해보세요"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((result) => (
            <DiscoverResultCard
              key={result.restaurant.kakaoId}
              result={result}
              onFeedback={handleFeedback(result.restaurant.name, result.restaurant.kakaoId)}
            />
          ))}

          {/* Feedback prompt */}
          <div className="mt-2 text-center">
            <p className="text-xs text-neutral-400">결과가 마음에 드셨나요?</p>
          </div>
        </div>
      )}
    </div>
  )
}
