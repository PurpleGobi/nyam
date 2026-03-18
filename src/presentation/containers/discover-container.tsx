"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Compass, MapPin, Loader2, Search } from "lucide-react"
import { useDiscoverEngine } from "@/application/hooks/use-discover-engine"
import { useDiscoverOnboarding } from "@/application/hooks/use-discover-onboarding"
import type { OnboardingSelections } from "@/application/hooks/use-discover-onboarding"
import { useGeolocation } from "@/application/hooks/use-geolocation"
import { DiscoverDebugLog } from "@/presentation/components/discover/discover-debug-log"
import { DiscoverOnboarding } from "@/presentation/components/discover/discover-onboarding"
import { DiscoverResultCard } from "@/presentation/components/discover/discover-result-card"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"
import { DISCOVER_SCENES } from "@/shared/constants/scenes"
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
    toggleArea,
    toggleScene,
    setGenre,
    setQuery,
    searchNearby,
    sendFeedback,
    isNearbyMode,
    isSeedActive,
    toggleNearby,
  } = useDiscoverEngine(seed)

  const { location, loading: geoLoading, requestLocation } = useGeolocation()
  const [manualView, setManualView] = useState<ViewState | null>(null)
  const [queryText, setQueryText] = useState("")

  // Auto-activate nearby mode on first load when GPS available
  const [nearbyInitialized, setNearbyInitialized] = useState(false)
  useEffect(() => {
    if (!nearbyInitialized && location && !isSeedActive) {
      searchNearby(location.lat, location.lng)
      setNearbyInitialized(true)
    }
  }, [location, nearbyInitialized, isSeedActive, searchNearby])

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
    if (firstArea) toggleArea(firstArea)
    if (firstScene) toggleScene(firstScene)
    setManualView("results")
  }, [completeOnboarding, toggleArea, toggleScene])

  const handleOnboardingSkip = useCallback(async () => {
    await skipOnboarding()
    setManualView("search")
  }, [skipOnboarding])

  const handleGenreSelect = useCallback((genre: string) => {
    setGenre(filters.genre === genre ? null : genre)
  }, [filters.genre, setGenre])

  const handleNearbyToggle = useCallback(() => {
    if (location) {
      toggleNearby(location.lat, location.lng)
    } else {
      requestLocation()
    }
  }, [location, toggleNearby, requestLocation])

  const handleSearch = useCallback(() => {
    if (filters.areas.length > 0 || filters.scenes.length > 0 || isNearbyMode || queryText.trim()) {
      if (queryText.trim()) setQuery(queryText.trim())
      setManualView("results")
    }
  }, [filters.areas, filters.scenes, isNearbyMode, queryText, setQuery])

  const handleQueryTextSubmit = useCallback(() => {
    const trimmed = queryText.trim()
    if (!trimmed) return
    setQuery(trimmed)
    setManualView("results")
  }, [queryText, setQuery])

  const handleBackToSearch = useCallback(() => {
    setManualView("search")
  }, [])

  const handleFeedback = useCallback((restaurantName: string, kakaoId: string | null) => {
    return (feedback: "good" | "bad") => {
      sendFeedback(restaurantName, kakaoId, feedback)
    }
  }, [sendFeedback])

  // --- Filter Bar (shared between search & results views) ---
  const filterBar = (
    <div className="flex flex-col gap-2">
      {/* Scene filters - 누구랑 */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-semibold text-neutral-400">누구랑</span>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {DISCOVER_SCENES.map((scene) => (
            <button
              key={scene.value}
              type="button"
              onClick={() => toggleScene(scene.value)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                filters.scenes.includes(scene.value)
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              )}
            >
              {scene.label}
            </button>
          ))}
        </div>
      </div>

      {/* Area filters - 어디서 */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-semibold text-neutral-400">어디서</span>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={handleNearbyToggle}
            disabled={geoLoading}
            className={cn(
              "shrink-0 flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              isNearbyMode
                ? "bg-blue-500 text-white"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100",
            )}
          >
            {geoLoading ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <MapPin className="h-2.5 w-2.5" />
            )}
            내주변
          </button>
          {QUICK_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleArea(area)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                filters.areas.includes(area)
                  ? "bg-blue-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              )}
            >
              {area}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

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

  // Search entry screen
  if (viewState === "search") {
    return (
      <div className="flex flex-col gap-4 px-4 pt-4 pb-4">
        {/* Filter bar at top */}
        {filterBar}

        {/* Natural language input bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleQueryTextSubmit() }}
            placeholder="강남 파스타, 비 오는 날 따뜻한 거..."
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-10 pr-4 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300 transition-colors"
          />
        </div>

        {/* Search button */}
        {(filters.areas.length > 0 || filters.scenes.length > 0 || isNearbyMode || queryText.trim()) && (
          <button
            type="button"
            onClick={handleSearch}
            className="w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 active:scale-[0.98] transition-all"
          >
            추천 받기
          </button>
        )}
      </div>
    )
  }

  // Results screen
  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
      {/* Filter bar at top */}
      {filterBar}

      {/* Results header */}
      <div className="flex items-center justify-between mt-1">
        <h1 className="text-lg font-bold text-neutral-800">
          {isNearbyMode
            ? `내 주변${filters.scenes.length > 0 ? ` ${filters.scenes.join(" ")}` : ""}`
            : [
                ...filters.areas,
                ...filters.scenes,
              ].join(" ") || "추천 결과"}
        </h1>
        <button
          type="button"
          onClick={handleBackToSearch}
          className="text-xs text-primary-500 font-medium hover:text-primary-600"
        >
          다시 검색
        </button>
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
        <DiscoverDebugLog
          isLoading={isLoading}
          isNearby={isNearbyMode}
          scenes={filters.scenes}
          areas={filters.areas}
          resultCount={results.length}
        />
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

          {/* Score disclaimer + feedback */}
          <div className="mt-2 text-center space-y-1">
            <p className="text-[10px] text-neutral-400">
              점수는 씬 적합성, 평판, 개인 취향을 종합한 상대적 지표이며 절대 기준이 아닙니다
            </p>
            <p className="text-xs text-neutral-400">결과가 마음에 드셨나요?</p>
          </div>
        </div>
      )}
    </div>
  )
}
