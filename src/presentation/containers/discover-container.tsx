"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { Compass, Sparkles, TrendingUp } from "lucide-react"
import { useDiscover } from "@/application/hooks/use-discover"
import { SearchBar } from "@/presentation/components/ui/search-bar"
import { RecordCard } from "@/presentation/components/record/record-card"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"
import { RESTAURANT_SCENES } from "@/shared/constants/scenes"
import { ROUTES } from "@/shared/constants/routes"
import { cn } from "@/shared/utils/cn"

export function DiscoverContainer() {
  const { results, trending, isSearching, hasSearched, search } = useDiscover()
  const [query, setQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [selectedScene, setSelectedScene] = useState<string | null>(null)

  const handleSearch = useCallback((q: string) => {
    setQuery(q)
    search(q, { genre: selectedGenre ?? undefined, scene: selectedScene ?? undefined })
  }, [search, selectedGenre, selectedScene])

  const handleGenreFilter = useCallback((genre: string) => {
    const newGenre = selectedGenre === genre ? null : genre
    setSelectedGenre(newGenre)
    search(query, { genre: newGenre ?? undefined, scene: selectedScene ?? undefined })
  }, [search, query, selectedGenre, selectedScene])

  const handleSceneFilter = useCallback((scene: string) => {
    const newScene = selectedScene === scene ? null : scene
    setSelectedScene(newScene)
    search(query, { genre: selectedGenre ?? undefined, scene: newScene ?? undefined })
  }, [search, query, selectedGenre, selectedScene])

  const displayRecords = hasSearched ? results : trending
  const showTrendingLabel = !hasSearched && trending.length > 0

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
      <SearchBar
        value={query}
        onChange={handleSearch}
        placeholder="맛집, 메뉴, 와인 검색"
      />

      {/* 장르 필터 */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {FOOD_CATEGORIES.slice(0, 10).map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => handleGenreFilter(cat.value)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
              selectedGenre === cat.value
                ? "bg-primary-500 text-white"
                : "bg-neutral-100 text-neutral-500",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 상황 필터 */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {RESTAURANT_SCENES.map((scene) => (
          <button
            key={scene.value}
            type="button"
            onClick={() => handleSceneFilter(scene.value)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
              selectedScene === scene.value
                ? "bg-blue-500 text-white"
                : "bg-blue-50 text-blue-600",
            )}
          >
            {scene.label}
          </button>
        ))}
      </div>

      {/* AI 추천 배너 */}
      <Link
        href={ROUTES.RECOMMEND}
        className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-primary-50 to-amber-50 px-4 py-3 transition-colors hover:from-primary-100 hover:to-amber-100"
      >
        <Sparkles className="h-5 w-5 text-primary-500" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-800">AI 맞춤 추천</p>
          <p className="text-xs text-neutral-500">나의 Taste DNA 기반 추천 받기</p>
        </div>
        <span className="text-xs text-primary-500 font-medium">→</span>
      </Link>

      {isSearching ? (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : displayRecords.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={hasSearched ? "검색 결과가 없어요" : "아직 공개된 기록이 없어요"}
          description={hasSearched ? "다른 키워드로 검색해보세요" : "첫 기록을 남겨보세요"}
        />
      ) : (
        <>
          {showTrendingLabel && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary-500" />
              <span className="text-sm font-semibold text-neutral-700">인기 기록</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {displayRecords.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
