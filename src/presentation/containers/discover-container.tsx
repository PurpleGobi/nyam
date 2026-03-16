"use client"

import { Search, Star } from "lucide-react"
import { useState } from "react"
import { FOOD_CATEGORIES, SITUATIONS } from "@/shared/constants/categories"
import { useDiscover } from "@/application/hooks/use-discover"

export function DiscoverContainer() {
  const [query, setQuery] = useState("")
  const { data: results, isLoading } = useDiscover(query)

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-neutral-400)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="음식, 장소, 태그 검색..."
          className="w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] py-3 pl-10 pr-4 text-sm placeholder:text-[var(--color-neutral-400)] focus:border-[#FF6038] focus:outline-none focus:ring-1 focus:ring-[#FF6038]"
        />
      </div>

      {/* Category Filter Chips */}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-[var(--color-neutral-600)]">
          카테고리
        </h3>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
          {FOOD_CATEGORIES.map((category) => (
            <button
              key={category.value}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-neutral-200)] bg-white px-3.5 py-2 text-sm text-[var(--color-neutral-700)] transition-colors hover:border-[#FF6038] hover:text-[#FF6038]"
            >
              <span>{category.emoji}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Situation Filter Chips */}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-[var(--color-neutral-600)]">
          상황
        </h3>
        <div className="-mx-4 flex flex-wrap gap-2 px-4">
          {SITUATIONS.map((situation) => (
            <button
              key={situation}
              className="rounded-full border border-[var(--color-neutral-200)] bg-white px-3.5 py-2 text-sm text-[var(--color-neutral-700)] transition-colors hover:border-[#FF6038] hover:text-[#FF6038]"
            >
              {situation}
            </button>
          ))}
        </div>
      </section>

      {/* Search Results or Empty State */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
          ))}
        </div>
      ) : results && results.length > 0 ? (
        <div className="flex flex-col gap-2">
          {results.map((record) => (
            <div key={record.id} className="flex items-center justify-between rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--color-neutral-800)]">{record.menuName}</span>
                <span className="text-xs text-[var(--color-neutral-400)]">
                  {record.category} · {new Date(record.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-[#FF6038]" />
                <span className="text-sm font-medium text-[var(--color-neutral-700)]">{record.ratingOverall.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-16">
          <Search className="mb-3 h-8 w-8 text-[var(--color-neutral-300)]" />
          <p className="text-center text-sm text-[var(--color-neutral-500)]">
            {query.trim() ? '검색 결과가 없습니다' : '공개된 기록을 탐색해보세요'}
          </p>
        </div>
      )}
    </div>
  )
}
