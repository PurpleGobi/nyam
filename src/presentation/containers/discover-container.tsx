"use client"

import { useCallback, useState } from "react"
import { useDiscover } from "@/application/hooks/use-discover"
import { SearchBar } from "@/presentation/components/ui/search-bar"
import { RecordCard } from "@/presentation/components/record/record-card"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"
import { cn } from "@/shared/utils/cn"
import { Compass } from "lucide-react"

export function DiscoverContainer() {
  const { results, isSearching, search } = useDiscover()
  const [query, setQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)

  const handleSearch = useCallback((q: string) => {
    setQuery(q)
    search(q, { genre: selectedGenre ?? undefined })
  }, [search, selectedGenre])

  const handleGenreFilter = useCallback((genre: string) => {
    const newGenre = selectedGenre === genre ? null : genre
    setSelectedGenre(newGenre)
    search(query, { genre: newGenre ?? undefined })
  }, [search, query, selectedGenre])

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
      <SearchBar
        value={query}
        onChange={handleSearch}
        placeholder="맛집, 메뉴, 와인 검색"
      />

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

      {isSearching ? (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="검색 결과가 없어요"
          description="다른 키워드로 검색해보세요"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {results.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  )
}
