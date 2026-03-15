'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, SearchX, AlertCircle } from 'lucide-react'
import { useRestaurants } from '@/application/hooks/use-restaurants'
import { useFavorites } from '@/application/hooks/use-favorites'
import { RestaurantCard } from '@/presentation/components/restaurant/restaurant-card'
import { RestaurantCardSkeleton } from '@/presentation/components/restaurant/restaurant-card-skeleton'
import { EmptyState } from '@/presentation/components/shared/empty-state'
import { Input } from '@/components/ui/input'
import { FOOD_CATEGORIES } from '@/shared/constants/categories'
import { ROUTES } from '@/shared/constants/routes'
import type { RestaurantFilter } from '@/domain/repositories/restaurant-repository'
import type { CuisineCategory } from '@/domain/entities/restaurant'
import { cn } from '@/shared/utils/cn'

/** Map food category IDs to CuisineCategory values */
const categoryIdToLabel: Record<string, CuisineCategory> = {
  korean: '한식',
  japanese: '일식',
  chinese: '중식',
  western: '양식',
  'cafe-dessert': '카페',
  'southeast-asian': '아시안',
  'street-food': '분식',
  'meat-grill': '기타',
  seafood: '기타',
  'vegetarian-healthy': '기타',
}

/**
 * Explore tab container.
 * Search, category filter, and restaurant listing with loading/error/empty states.
 */
export function ExploreContainer() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filter: RestaurantFilter = {
    ...(selectedCategory && categoryIdToLabel[selectedCategory]
      ? { cuisineCategory: categoryIdToLabel[selectedCategory] }
      : {}),
    ...(searchQuery.trim() ? { query: searchQuery.trim() } : {}),
  }

  const { restaurants, isLoading, error } = useRestaurants({ filter })
  const { isFavorite, toggleFavorite } = useFavorites()

  const handleCategoryClick = useCallback((categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId))
  }, [])

  const handleFavoriteClick = useCallback(
    (restaurantId: string) => {
      void toggleFavorite(restaurantId)
    },
    [toggleFavorite],
  )

  const handleVerifyClick = useCallback((restaurantId: string) => {
    window.location.href = `${ROUTES.PROMPTS}?restaurantId=${restaurantId}`
  }, [])

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Search input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-neutral-400)]"
        />
        <Input
          placeholder="맛집 이름으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto">
        {FOOD_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => handleCategoryClick(category.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              selectedCategory === category.id
                ? 'border-transparent text-white'
                : 'border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]',
            )}
            style={
              selectedCategory === category.id
                ? { backgroundColor: category.color }
                : undefined
            }
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {/* Restaurant list */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <AlertCircle size={48} className="text-[var(--color-error-400)]" />
          <p className="text-sm text-[var(--color-error-500)]">
            데이터를 불러오지 못했어요.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-[var(--color-primary-500)] px-4 py-2 text-sm font-medium text-white"
          >
            다시 시도
          </button>
        </div>
      )}

      {!isLoading && !error && restaurants.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="검색 결과가 없어요"
          description={
            searchQuery
              ? `"${searchQuery}"에 해당하는 맛집을 찾지 못했어요.`
              : '조건에 맞는 맛집이 없어요. 필터를 변경해보세요.'
          }
        />
      )}

      {!isLoading && !error && restaurants.length > 0 && (
        <div className="flex flex-col gap-3">
          {restaurants.map((restaurant) => (
            <Link key={restaurant.id} href={`/restaurant/${restaurant.id}`}>
              <RestaurantCard
                restaurant={restaurant}
                isFavorite={isFavorite(restaurant.id)}
                onFavoriteClick={handleFavoriteClick}
                onVerifyClick={handleVerifyClick}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
